import { CloudVirtualMachineZone, VirtualMachinePackage, Region, ChargeType, VirtualMachinePackageFamily } from './entity'
import { reconcile } from './reconcile'
import util from 'util'
import { VmVendors } from './type'
import { client, db } from './db'
import { billingJob } from './billing-task'





async function createRegionAndZone() {

  const existed = await db.collection<Region>('Region').countDocuments()
  if (existed) {
    return
  }

  const regionList: Region[] = [
    {
      name: 'gzg.sealos.run',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: ['ap-guangzhou-7']
    },
  ]

  const session = client.startSession()

  try {
    session.startTransaction()
    await db.collection<Region>('Region').insertMany(regionList, { session })
    const gzg = await db.collection<Region>('Region').findOne(
      { sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f' },
      { session })

    const cloudVirtualMachineZone = await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone').insertOne(
      {
        regionId: gzg._id,
        cloudProviderZone: 'ap-guangzhou-6',
      }, { session }
    )

    const virtualMachinePackageFamily = {
      cloudVirtualMachineZoneId: cloudVirtualMachineZone.insertedId,
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      virtualMachinePackageFamily: 'A'
    }

    const res = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').insertOne(
      virtualMachinePackageFamily, { session }
    )
    const virtualMachinePackageList: VirtualMachinePackage[] = [
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM4',
        instancePrice: 0.15,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM8',
        instancePrice: 0.22,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE8',
        instancePrice: 0.3,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-4',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE16',
        instancePrice: 0.45,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-5',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE16',
        instancePrice: 0.6,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-6',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE32',
        instancePrice: 0.9,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-7',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE32',
        instancePrice: 1.2,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-8',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE64',
        instancePrice: 1.79,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-9',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE64',
        instancePrice: 2.39,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: res.insertedId,
        virtualMachinePackageName: 'sealos-10',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE128',
        instancePrice: 3.59,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundaryPerHour: 0.05,
        networkSpeedAboveSpeedBoundaryPerHour: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
    ]

    await db.collection<VirtualMachinePackage>('VirtualMachinePackage').insertMany(virtualMachinePackageList, { session })
    await session.commitTransaction()
  } catch (e) {
    await session.abortTransaction()
    throw e
  } finally {
    await session.endSession()
  }

}


export default async function (ctx: FunctionContext) {
  await createRegionAndZone()
  console.log('reconcile job isRunning: ', reconcile.reconcileStateJob.isRunning())
  console.log('billing job isRunning: ', billingJob.isRunning())
  console.log('EventEmitter: ', util.inspect(reconcile.eventEmitter, { showHidden: false, depth: 2 }))
  console.log('init...')

  return { data: 'hi, laf' }
}
