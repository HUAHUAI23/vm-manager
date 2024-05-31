import { db } from '../../db'
import { client as mongoClient } from '../../db'
import { State, CloudVirtualMachine, Phase, TencentCloudVirtualMachine, ChargeType, VirtualMachinePackage, CloudVirtualMachineSubscription, CloudVirtualMachineBilling, CloudVirtualMachineBillingState, VirtualMachinePackageFamily, Region, RenewalPlan, SubscriptionState, ErrorLogs } from "../../entity"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"
import { pgPool } from '../../db'
import { deductSealosBalance, validationEncrypt } from '@/utils'
import { getCloudVirtualMachineFee } from '@/billing-task'

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
      console.log(vmFee)

      const ok = await validationEncrypt(vm.sealosUserUid)

      if (!ok) {
        throw new Error('sealos account validate encrypt failed')
      }


      // pg transaction
      const pgClient = await pgPool.connect()
      // mongo transaction
      const session = mongoClient.startSession()

      try {
        await pgClient.query('BEGIN')
        await deductSealosBalance(vm.sealosUserUid, BigInt(vmFee.amount), pgClient)

        session.startTransaction()

        vm.phase = Phase.Created
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
          subscriptionId: cloudVirtualMachineSubscriptionInsertResult.insertedId
        }

        const cloudVirtualMachineBillingInsertResult = await db.collection<CloudVirtualMachineBilling>('CloudVirtualMachineBilling')
          .insertOne(cloudVirtualMachineBilling, { session })

        await TencentVmOperation.create(vm.metaData)

        const rollBackMongo = async () => {
          await db.collection<CloudVirtualMachine>('CloudVirtualMachine')
            .deleteOne({ _id: vmInsertResult.insertedId })
          await db.collection<CloudVirtualMachineSubscription>('CloudVirtualMachineSubscription')
            .deleteOne({ _id: cloudVirtualMachineSubscriptionInsertResult.insertedId })
          await db.collection<CloudVirtualMachineBilling>('CloudVirtualMachineBilling')
            .deleteOne({ _id: cloudVirtualMachineBillingInsertResult.insertedId })
        }

        try {
          await session.commitTransaction()
        } catch (MongoTransactionError) {
          console.error("Error committing MongoDB transaction:", MongoTransactionError.stack)
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
          throw MongoTransactionError  // 如果MongoDB事务提交失败，重新抛出错误
        }

        try {
          await pgClient.query('COMMIT')
        } catch (pgError) {
          console.error("Error committing PostgreSQL transaction:", pgError.stack)
          await rollBackMongo() // 处理MongoDB中的补偿逻辑

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

          await pgClient.query('ROLLBACK')

          return
        }

      } catch (error) {

        await pgClient.query('ROLLBACK')
        await session.abortTransaction()

        console.error('Error executing deduct sealos balance transaction', error.stack)
        await db.collection<ErrorLogs>('ErrorLogs').insertOne(
          {
            error: "Error TencentVm.create",
            createTime: new Date(),
            errorMessage: error.message,
            errorDetails: error.stack,
            errorLevel: 'Fatal',
            sealosUserId: vm.sealosUserId,
            sealosUserUid: vm.sealosUserUid,
            instanceName: vm.instanceName,
            serviceName: "TencentVm.create"
          }
        )
        throw error
      } finally {
        pgClient.release()
        await session.endSession()
      }

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