import { CloudVirtualMachineZone, VirtualMachinePackageList, Region, ChargeType, CloudVirtualMachine } from './entity'
import { reconcile } from './reconcile'
import util from 'util'
import { VmVendors } from './type'
import { client, db } from './db'
import { TASK_LOCK_INIT_TIME } from './constants'
import { ObjectId } from 'mongodb'
import { billingJob } from './billing-task'
async function createPrincePackageList() {
  const princePackageList: VirtualMachinePackageList[] = [
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-1',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM4',
      instancePrice: 0.15,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-2',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM8',
      instancePrice: 0.22,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-3',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.LARGE8',
      instancePrice: 0.3,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-4',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.LARGE16',
      instancePrice: 0.45,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-5',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE16',
      instancePrice: 0.6,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-6',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE32',
      instancePrice: 0.9,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-7',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE32',
      instancePrice: 1.2,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-8',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE64',
      instancePrice: 1.79,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-9',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE64',
      instancePrice: 2.39,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
    {
      virtualMachinePackageFamily: 'A',
      virtualMachinePackageName: 'sealos-10',
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-6',
      cloudProviderVirtualMachinePackageFamily: 'TS5',
      cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE128',
      instancePrice: 3.59,
      diskPerG: 0.0008,
      networkSpeedBoundary: 5,
      networkSpeedUnderSpeedBoundaryPerHour: 0.05,
      networkSpeedAboveSpeedBoundaryPerHour: 0.2,
      chargeType: ChargeType.PostPaidByHour
    },
  ]
  // const princePackageList: VirtualMachinePackageList[] = [
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-1',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM4',
  //     instancePrice: 0.15,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-2',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM8',
  //     instancePrice: 0.22,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-3',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.LARGE8',
  //     instancePrice: 0.3,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-4',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.LARGE16',
  //     instancePrice: 0.45,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-5',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE16',
  //     instancePrice: 0.6,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-6',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE32',
  //     instancePrice: 0.9,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-7',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE32',
  //     instancePrice: 1.2,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-8',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE64',
  //     instancePrice: 1.79,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-9',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE64',
  //     instancePrice: 2.39,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  //   {
  //     virtualMachinePackageFamily: 'A',
  //     virtualMachinePackageName: 'sealos-10',
  //     sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
  //     sealosRegionDomain: '192.168.0.55.nip.io',
  //     cloudProvider: VmVendors.Tencent,
  //     cloudProviderZone: 'ap-guangzhou-6',
  //     cloudProviderVirtualMachinePackageFamily: 'TS5',
  //     cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE128',
  //     instancePrice: 3.59,
  //     diskPerG: 0.0008,
  //     networkSpeedBoundary: 5,
  //     networkSpeedUnderSpeedBoundaryPerHour: 0.05,
  //     networkSpeedAboveSpeedBoundaryPerHour: 0.2,
  //     chargeType: ChargeType.PostPaidByHour
  //   },
  // ]

  const existed = await db.collection<VirtualMachinePackageList>('VirtualMachinePackageList').countDocuments()

  if (existed) {
    return
  }
  await db.collection<VirtualMachinePackageList>('VirtualMachinePackageList').insertMany(princePackageList)
}

async function createRegionAndZone() {

  const existed = await db.collection<Region>('Region').countDocuments()
  if (existed) {
    return
  }

  const regionList: Region[] = [
    {
      sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
      sealosRegionDomain: 'gzg.sealos.run',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: 'ap-guangzhou-7'
    },
  ]

  const session = client.startSession()

  try {
    session.startTransaction()
    await db.collection<Region>('Region').insertMany(regionList, { session })
    const gzg = await db.collection<Region>('Region').findOne(
      { sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f' },
      { session })

    await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone').insertOne(
      {
        regionId: gzg._id,
        cloudProviderZone: 'ap-guangzhou-6',
      }, { session }
    )
    await session.commitTransaction()
  } catch (e) {
    await session.abortTransaction()
    throw e
  } finally {
    await session.endSession()
  }

}


export default async function (ctx: FunctionContext) {
  await createPrincePackageList()
  await createRegionAndZone()
  console.log('reconcile job isRunning: ', reconcile.reconcileStateJob.isRunning())
  console.log('billing job isRunning: ', billingJob.isRunning())
  console.log('EventEmitter: ', util.inspect(reconcile.eventEmitter, { showHidden: false, depth: 2 }))
  console.log('init...')

  return { data: 'hi, laf' }
}
