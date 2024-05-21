import { db, client } from './db'
import { CloudVirtualMachine, CloudVirtualMachineBilling, CloudVirtualMachineBillingState, Phase, State, VirtualMachinePackage, VirtualMachinePackageFamily, getPriceForBandwidth } from './entity'
import { Cron } from "croner"
import { BillingJob, getSealosUserAccount } from './utils'
import { Decimal } from 'decimal.js'
import CONSTANTS from './constants'

// todo 添加欠费删除与欠费关机逻辑 欠费标识

async function tick() {
  await handleCloudVirtualMachineBillingCreating()
}

async function handleCloudVirtualMachineBillingCreating() {
  const res = await db.collection<CloudVirtualMachine>('CloudVirtualMachine').
    findOneAndUpdate({
      // 例如当前时间是 12:34:56.789  则 只找出最后一次计费时间在 11:34:56.789 之前的 CloudVirtualMachine
      latestBillingTime: {
        $lt: new Date(Date.now() - CONSTANTS.BILLING_INTERVAL),
      },
      billingLockedAt: {
        $lt: new Date(Date.now() - CONSTANTS.BILLING_LOCK_TIMEOUT),
      },
      // 已关机和已启动的虚拟机
      phase: { $in: [Phase.Started, Phase.Stopped] }
    }, {
      $set: { billingLockedAt: new Date() }
    }
    )

  if (!res.value) {
    console.info('No CloudVirtualMachine found for billing')
    return
  }

  const cloudVirtualMachine = res.value
  console.info(`CloudVirtualMachine ${cloudVirtualMachine.instanceName} found for billing`)

  try {
    const billingTime = await createCloudVirtualMachineBilling(cloudVirtualMachine)
    if (!billingTime) {
      console.debug(`No billing time found for CloudVirtualMachine: ${cloudVirtualMachine.instanceName}`)
      return
    }
  } catch (err) {
    console.error(
      'handleCloudVirtualMachineBillingCreating error',
      err,
      err.stack,
    )
  } finally {
    handleCloudVirtualMachineBillingCreating
  }
}

async function createCloudVirtualMachineBilling(cloudVirtualMachine: CloudVirtualMachine) {
  const latestBillingTime = new Date()
  // 当前时刻的准点 例如当前时间是 12:34:56.789  则 latestBillingTime 是 12:00:00.000 即 计费周期 12:00:00.000 - 13:00:00.000
  latestBillingTime.setMinutes(0)
  latestBillingTime.setSeconds(0)
  latestBillingTime.setMilliseconds(0)


  const virtualMachinePackageFamily = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily')
    .findOne({
      cloudVirtualMachineZoneId: cloudVirtualMachine.zoneId,
      _id: cloudVirtualMachine.virtualMachinePackageFamilyId
    })

  if (!virtualMachinePackageFamily) {
    throw new Error('virtualMachinePackageFamily not found')
  }

  const virtualMachinePackage = await db.collection<VirtualMachinePackage>('VirtualMachinePackage')
    .findOne({
      virtualMachinePackageName: cloudVirtualMachine.virtualMachinePackageName,
      virtualMachinePackageFamilyId: virtualMachinePackageFamily._id,
      chargeType: cloudVirtualMachine.chargeType
    })


  const cloudVirtualMachineBilling: CloudVirtualMachineBilling = {
    sealosUserId: cloudVirtualMachine.sealosUserId,
    sealosUserUid: cloudVirtualMachine.sealosUserUid,
    sealosRegionUid: cloudVirtualMachine.sealosRegionUid,
    sealosRegionDomain: cloudVirtualMachine.sealosRegionDomain,
    sealosNamespace: cloudVirtualMachine.sealosNamespace,

    namespace: cloudVirtualMachine.sealosNamespace,
    instanceName: cloudVirtualMachine.instanceName,
    region: cloudVirtualMachine.region,
    zoneId: cloudVirtualMachine.zoneId,
    zoneName:cloudVirtualMachine.zoneName,

    virtualMachinePackageFamilyId: virtualMachinePackageFamily._id,
    virtualMachinePackageName: virtualMachinePackage.virtualMachinePackageName,
    cloudProviderVirtualMachinePackageFamily: virtualMachinePackageFamily.cloudProviderVirtualMachinePackageFamily,
    cloudProviderVirtualMachinePackageName: virtualMachinePackage.cloudProviderVirtualMachinePackageName,
    cloudProviderZone: cloudVirtualMachine.cloudProviderZone,
    cloudProvider: cloudVirtualMachine.cloudProvider,
    detail: {
      instance: 0,
      network: 0,
      disk: 0
    },
    startAt: latestBillingTime,
    endAt: new Date(latestBillingTime.getTime() + CONSTANTS.BILLING_INTERVAL),
    amount: 0,
    state: CloudVirtualMachineBillingState.Pending,
    chargeType: cloudVirtualMachine.chargeType
  }


  let instancePrice = new Decimal(virtualMachinePackage.instancePrice)

  let diskPrice = new Decimal(virtualMachinePackage.diskPerG)
    .mul(new Decimal(cloudVirtualMachine.disk))

  const networkPricePerMbps = getPriceForBandwidth(virtualMachinePackage, cloudVirtualMachine.internetMaxBandwidthOut)


  let networkPrice = new Decimal(networkPricePerMbps)
    .mul(new Decimal(cloudVirtualMachine.internetMaxBandwidthOut))


  if (cloudVirtualMachine.phase === Phase.Stopped) {
    instancePrice = new Decimal(0)
    networkPrice = new Decimal(0)
  }

  const totalAmount = instancePrice.plus(networkPrice)
    .plus(diskPrice)

  cloudVirtualMachineBilling.amount = totalAmount.toNumber()
  cloudVirtualMachineBilling.detail.instance = instancePrice.toNumber()
  cloudVirtualMachineBilling.detail.network = networkPrice.toNumber()
  cloudVirtualMachineBilling.detail.disk = diskPrice.toNumber()


  const sealosAccountRMB = await getSealosUserAccount(cloudVirtualMachine.sealosUserUid)
  const sealosaccountBalance = sealosAccountRMB - cloudVirtualMachineBilling.amount

  if (sealosaccountBalance < 0 && cloudVirtualMachine.state === State.Running && cloudVirtualMachine.phase === Phase.Started) {
    const res = await db.collection<CloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: cloudVirtualMachine._id,
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

    if (res.value) {
      console.info(`CloudVirtualMachine instanceName ${cloudVirtualMachine.instanceName} has been stopped due to insufficient balance`)
    } else {
      console.debug(`insufficient balance, CloudVirtualMachine instanceName ${cloudVirtualMachine.instanceName} failed to stop due to user has changed the state of the virtual machine`)
    }

  }


  const session = client.startSession()
  try {
    session.startTransaction()
    const res = await db.collection<CloudVirtualMachineBilling>('CloudVirtualMachineBilling')
      .insertOne(cloudVirtualMachineBilling, { session })

    await db.collection<CloudVirtualMachine>('CloudVirtualMachine').updateOne(
      { _id: cloudVirtualMachine._id },
      {
        $set: { latestBillingTime, billingLockedAt: CONSTANTS.TASK_LOCK_INIT_TIME }
      },
      { session }
    )

    console.info(
      `Billing creation complete for cloudVirtualMachine instanceName: ${cloudVirtualMachine.instanceName} from ${latestBillingTime.toISOString()} to ${new Date(latestBillingTime.getTime() + CONSTANTS.BILLING_INTERVAL).toISOString()} for billing ${res.insertedId}`,
    )

    await session.commitTransaction()
    return latestBillingTime
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    console.log('hello test')
    await session.endSession()
  }
}

export const billingJob: Cron = BillingJob
billingJob.schedule(() => {
  tick()
})
billingJob.resume()

export function getCloudVirtualMachineOneHourFee(virtualMachinePackage: VirtualMachinePackage, internetMaxBandwidthOut: number, diskSize: number) {
  let instancePrice = new Decimal(virtualMachinePackage.instancePrice)

  let diskPrice = new Decimal(virtualMachinePackage.diskPerG)
    .mul(new Decimal(diskSize))

  const networkPricePerMbps = getPriceForBandwidth(virtualMachinePackage, internetMaxBandwidthOut)
  let networkPrice =
    new Decimal(networkPricePerMbps)
      .mul(new Decimal(internetMaxBandwidthOut))



  const totalAmount = instancePrice.plus(networkPrice)
    .plus(diskPrice).toNumber()

  return totalAmount
}