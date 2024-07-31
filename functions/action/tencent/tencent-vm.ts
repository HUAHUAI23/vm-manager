import { db } from '../../db'
import { client as mongoClient } from '../../db'
import { State, CloudVirtualMachine, Phase, TencentCloudVirtualMachine, ChargeType, VirtualMachinePackage, CloudVirtualMachineSubscription, CloudVirtualMachineBilling, CloudVirtualMachineBillingState, VirtualMachinePackageFamily, RenewalPlan, SubscriptionState, ErrorLogs } from "../../entity"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"
import { pgPool } from '../../db'
import { AccountTransaction, AccountTransactionMessage, AccountTransactionType, deductSealosBalance } from '@/utils'
import { getCloudVirtualMachineFee } from '@/billing-task'
import { v4 as uuidv4 } from 'uuid'
import { QueryConfig } from 'pg'
import Decimal from 'decimal.js'
import CONSTANTS from '@/constants'

export class TencentVm {
  static async create(vm: TencentCloudVirtualMachine, period?: number): Promise<void> {
    if (vm.chargeType === ChargeType.PrePaid) {

      const instanceList = await TencentVmOperation.getVmDetailsListByInstanceName(vm.instanceName)

      if (instanceList.length > 0) {
        throw new Error(`The instanceName ${vm.instanceName} have created`)
      }

      const virtualMachinePackageFamily = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily')
        .findOne({
          _id: vm.virtualMachinePackageFamilyId
        })

      if (!virtualMachinePackageFamily) {
        throw new Error('virtualMachinePackageFamily not found')
      }

      const virtualMachinePackage = await db.collection<VirtualMachinePackage>('VirtualMachinePackage')
        .findOne({
          virtualMachinePackageName: vm.virtualMachinePackageName,
          virtualMachinePackageFamilyId: vm.virtualMachinePackageFamilyId,
          chargeType: vm.chargeType
        })


      if (!virtualMachinePackage) {
        throw new Error('virtualMachinePackage not found')
      }

      const vmFee = getCloudVirtualMachineFee(
        virtualMachinePackage,
        vm.internetMaxBandwidthOut,
        vm.disk,
        period
      )

      const session = mongoClient.startSession()

      let rollBackMongo: () => Promise<void>

      const billingUuid = uuidv4()

      try {
        session.startTransaction()

        vm.phase = Phase.Creating
        vm.state = State.Running

        const vmInsertResult = await db.collection<CloudVirtualMachine>('CloudVirtualMachine')
          .insertOne(vm, { session })

        const currentTime = new Date()
        const expireTime = new Date(currentTime)
        expireTime.setMonth(currentTime.getMonth() + period)

        // 插入 订阅表
        const cloudVirtualMachineSubscription: CloudVirtualMachineSubscription = {
          sealosUserId: vm.sealosUserId,
          sealosUserUid: vm.sealosUserUid,
          sealosRegionUid: vm.sealosRegionUid,
          sealosRegionDomain: vm.sealosRegionDomain,
          sealosNamespace: vm.sealosNamespace,
          region: vm.region,
          zoneId: vm.zoneId,
          zoneName: vm.zoneName,
          instanceName: vm.instanceName,

          virtualMachinePackageFamilyId: vm.virtualMachinePackageFamilyId,
          virtualMachinePackageName: vm.virtualMachinePackageName,
          cloudProviderVirtualMachinePackageFamily: virtualMachinePackageFamily.cloudProviderVirtualMachinePackageFamily,
          cloudProviderVirtualMachinePackageName: virtualMachinePackage.cloudProviderVirtualMachinePackageName,
          cloudProviderZone: vm.cloudProviderZone,
          cloudProvider: vm.cloudProvider,

          detail: {
            instance: vmFee.instance,
            network: vmFee.network,
            disk: vmFee.disk
          },

          renewalPlan: RenewalPlan.Manual,
          state: SubscriptionState.Done,
          createTime: currentTime,
          updateTime: currentTime,
          expireTime: expireTime,
          subscriptionDuration: period,
        }

        const cloudVirtualMachineSubscriptionInsertResult =
          await db.collection<CloudVirtualMachineSubscription>('CloudVirtualMachineSubscription')
            .insertOne(cloudVirtualMachineSubscription, { session })

        // 插入 账单表
        const cloudVirtualMachineBilling: CloudVirtualMachineBilling = {
          sealosUserId: vm.sealosUserId,
          sealosUserUid: vm.sealosUserUid,
          sealosRegionUid: vm.sealosRegionUid,
          sealosRegionDomain: vm.sealosRegionDomain,
          sealosNamespace: vm.sealosNamespace,

          namespace: vm.sealosNamespace,
          instanceName: vm.instanceName,
          region: vm.region,
          zoneId: vm.zoneId,
          zoneName: vm.zoneName,

          virtualMachinePackageFamilyId: vm.virtualMachinePackageFamilyId,
          virtualMachinePackageName: vm.virtualMachinePackageName,
          cloudProviderVirtualMachinePackageFamily: virtualMachinePackageFamily.cloudProviderVirtualMachinePackageFamily,
          cloudProviderVirtualMachinePackageName: virtualMachinePackage.cloudProviderVirtualMachinePackageName,
          cloudProviderZone: vm.cloudProviderZone,
          cloudProvider: vm.cloudProvider,

          detail: {
            instance: vmFee.instance,
            network: vmFee.network,
            disk: vmFee.disk,
          },

          startAt: currentTime,
          endAt: expireTime,
          amount: vmFee.amount,

          state: CloudVirtualMachineBillingState.Done,
          chargeType: vm.chargeType,
          subscriptionId: cloudVirtualMachineSubscriptionInsertResult.insertedId,
          uuid: billingUuid
        }

        const cloudVirtualMachineBillingInsertResult = await db.collection<CloudVirtualMachineBilling>('CloudVirtualMachineBilling')
          .insertOne(cloudVirtualMachineBilling, { session })

        rollBackMongo = async () => {
          await db.collection<CloudVirtualMachine>('CloudVirtualMachine')
            .deleteOne({ _id: vmInsertResult.insertedId })
          await db.collection<CloudVirtualMachineSubscription>('CloudVirtualMachineSubscription')
            .deleteOne({ _id: cloudVirtualMachineSubscriptionInsertResult.insertedId })
          await db.collection<CloudVirtualMachineBilling>('CloudVirtualMachineBilling')
            .deleteOne({ _id: cloudVirtualMachineBillingInsertResult.insertedId })
        }


        await session.commitTransaction()

      } catch (MongoTransactionError) {
        console.error("Error committing MongoDB transaction:", MongoTransactionError.stack)

        await session.abortTransaction()

        await db.collection<ErrorLogs>('ErrorLogs').insertOne(
          {
            error: "Error committing MongoDB transaction",
            createTime: new Date(),
            errorMessage: MongoTransactionError.message,
            errorDetails: MongoTransactionError.stack,
            errorLevel: 'Fatal',
            sealosUserId: vm.sealosUserId,
            sealosUserUid: vm.sealosUserUid,
            instanceName: vm.instanceName,
            serviceName: "TencentVm.create"
          }
        )

        throw MongoTransactionError
      }

      // pg transaction
      const pgClient = await pgPool.connect()

      try {
        await pgClient.query('BEGIN')

        const deduction_balance = new Decimal(vmFee.amount).mul(CONSTANTS.RMB_TO_SEALOS).toNumber()

        await deductSealosBalance(vm.sealosUserUid, BigInt(deduction_balance), pgClient)

        const accountTransaction: AccountTransaction = {
          type: AccountTransactionType.CloudVirtualMachine,
          userUid: vm.sealosUserUid,
          deduction_balance: BigInt(deduction_balance),
          balance: BigInt(0),
          message: AccountTransactionMessage.Tencent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          billing_id: billingUuid
        }

        const addAccountTransaction: QueryConfig<string[]> = {
          text: `
          INSERT INTO "AccountTransaction" 
          (type, "userUid", deduction_balance, balance, message, created_at, updated_at, billing_id)
          VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp, $6)
          `,
          values: [
            accountTransaction.type,
            accountTransaction.userUid,
            accountTransaction.deduction_balance.toString(),
            accountTransaction.balance.toString(),
            accountTransaction.message,
            accountTransaction.billing_id
          ]
        }

        await pgClient.query(addAccountTransaction)

        await pgClient.query('COMMIT')

      } catch (pgError) {
        console.error("Error committing PostgreSQL transaction:", pgError.stack)

        try {
          await rollBackMongo() // 处理MongoDB中的补偿逻辑
        } catch (mongoRollBackError) {
          console.error("Error rolling back MongoDB transaction:", mongoRollBackError.stack)

          await db.collection<ErrorLogs>('ErrorLogs').insertOne(
            {
              error: "Error rolling back MongoDB transaction",
              createTime: new Date(),
              errorMessage: mongoRollBackError.message,
              errorDetails: mongoRollBackError.stack,
              errorLevel: 'Fatal',
              sealosUserId: vm.sealosUserId,
              sealosUserUid: vm.sealosUserUid,
              instanceName: vm.instanceName,
              serviceName: "TencentVm.create"
            }
          )

        }

        await pgClient.query('ROLLBACK')

        await db.collection<ErrorLogs>('ErrorLogs').insertOne(
          {
            error: "Error committing PostgreSQL transaction",
            createTime: new Date(),
            errorMessage: pgError.message,
            errorDetails: pgError.stack,
            errorLevel: 'Fatal',
            sealosUserId: vm.sealosUserId,
            sealosUserUid: vm.sealosUserUid,
            instanceName: vm.instanceName,
            serviceName: "TencentVm.create"
          }
        )

        throw pgError
      }

      pgClient.release()
      await session.endSession()

      await TencentVmOperation.create(vm.metaData, vm.instanceName)
      console.info(`create ${vm.instanceName}`)

      return
    }

    await db.collection<CloudVirtualMachine>('CloudVirtualMachine').insertOne(vm)
    return
  }

  // Todo findOneAndUpdate 设计思路文档补充
  static async start(tencentVm: TencentCloudVirtualMachine): Promise<boolean> {

    const res = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: tencentVm._id,
        state: State.Stopped,
        phase: Phase.Stopped
      },
      {
        $set: {
          state: State.Running,
          phase: Phase.Starting,
          updateTime: new Date()
        }
      }
    )

    if (!res.value) {
      return false
    }

    return true


  }

  static async stop(tencentVm: TencentCloudVirtualMachine): Promise<boolean> {
    const res = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: tencentVm._id,
        state: State.Running,
        phase: Phase.Started
      },
      {
        $set: {
          state: State.Stopped,
          phase: Phase.Stopping,
          updateTime: new Date()
        }
      }
    )

    if (!res.value) {
      return false
    }

    return true

  }

  static async restart(tencentVm: TencentCloudVirtualMachine): Promise<boolean> {
    const res = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: tencentVm._id,
        state: State.Running,
        phase: Phase.Started
      },
      {
        $set: {
          state: State.Restarting,
          phase: Phase.Started,
          updateTime: new Date()
        }
      }
    )

    if (!res.value) {
      return false
    }

    return true
  }

  static async delete(tencentVm: TencentCloudVirtualMachine): Promise<boolean> {
    if (tencentVm.chargeType === ChargeType.PrePaid) {
      throw new Error('PrePaid instance can not be deleted')
    }

    const res = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: tencentVm._id,
        state: State.Stopped,
        phase: Phase.Stopped
      },
      {
        $set: {
          state: State.Deleted,
          phase: Phase.Deleting,
          updateTime: new Date()
        }
      }
    )

    if (!res.value) {
      return false
    }

    return true

  }



  static async change(params: any): Promise<void> {
    // 变更套餐需要在关机状态下进行

    // 扩容磁盘需要在开机状态下进行
    throw new Error("Method not implemented.")
  }
}