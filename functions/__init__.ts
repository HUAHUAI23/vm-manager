import { CloudVirtualMachineZone, VirtualMachinePackage, Region, ChargeType, VirtualMachinePackageFamily, VirtualMachineType, Arch } from './entity'
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
    // gzg tencent
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

    await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone').insertMany(
      [
        // gzg
        {
          regionId: gzg._id,
          cloudProviderZone: 'ap-guangzhou-6',
        },
        {
          regionId: gzg._id,
          cloudProviderZone: 'ap-guangzhou-7',
        },

      ], { session }
    )

    const guangzhou7 = await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone').findOne(
      { regionId: gzg._id, cloudProviderZone: 'ap-guangzhou-7' },
      { session }
    )

    const guangzhou6 = await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone').findOne(
      { regionId: gzg._id, cloudProviderZone: 'ap-guangzhou-6' },
      { session }
    )

    const virtualMachinePackageFamily: VirtualMachinePackageFamily[] = [
      // guangzhou6
      // x86 计算
      // 特惠
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'TS5',
        virtualMachinePackageFamily: 'A',
        virtualMachineArch: Arch.X86_64,
        virtualMachineType: VirtualMachineType.CostEffective,
      },
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'TM5',
        virtualMachinePackageFamily: 'B',
        virtualMachineArch: Arch.X86_64,
        virtualMachineType: VirtualMachineType.CostEffective,
      },
      // 异构计算
      // GPU
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'GNV4',
        virtualMachinePackageFamily: 'A',
        virtualMachineArch: Arch.Heterogeneous,
        virtualMachineType: VirtualMachineType.GPU,
      },
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'GN7',
        virtualMachinePackageFamily: 'B',
        virtualMachineArch: Arch.Heterogeneous,
        virtualMachineType: VirtualMachineType.GPU,
      },
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'GN10Xp',
        virtualMachinePackageFamily: 'C',
        virtualMachineArch: Arch.Heterogeneous,
        virtualMachineType: VirtualMachineType.GPU,
      },

      // guangzhou7
      // 异构计算
      // GPU

    ]


    await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').insertMany(
      virtualMachinePackageFamily, { session }
    )

    const TS5 = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'TS5' },
      { session }
    )
    const TM5 = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'TM5' },
      { session }
    )
    const GNV4 = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'GNV4' },
      { session }
    )
    const GN7 = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'GN7' },
      { session }
    )
    const GN10Xp = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'GN10Xp' },
      { session }
    )

    const virtualMachinePackageList: VirtualMachinePackage[] = [
      // TS5
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM4',
        instancePrice: 0.15,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM8',
        instancePrice: 0.22,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE8',
        instancePrice: 0.3,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-4',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE16',
        instancePrice: 0.45,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-5',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE16',
        instancePrice: 0.6,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-6',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE32',
        instancePrice: 0.9,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-7',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE32',
        instancePrice: 1.2,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-8',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE64',
        instancePrice: 1.79,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-9',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE64',
        instancePrice: 2.39,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-10',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE128',
        instancePrice: 3.59,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      // TM5
      {
        virtualMachinePackageFamilyId: TM5._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TM5.2XLARGE64',
        instancePrice: 2.2,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TM5._id,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TM5.4XLARGE128',
        instancePrice: 4.4,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TM5._id,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TM5.8XLARGE256',
        instancePrice: 8.8,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      //GNV4
      {
        virtualMachinePackageFamilyId: GNV4._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'GNV4.3XLARGE44',
        instancePrice: 9.2,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      // GN7
      {
        virtualMachinePackageFamilyId: GN7._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'GN7.2XLARGE32',
        instancePrice: 8.7,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
        chargeType: ChargeType.PostPaidByHour
      },
      // GN10Xp
      {
        virtualMachinePackageFamilyId: GN10Xp._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'GN10Xp.2XLARGE40',
        instancePrice: 12,
        diskPerG: 0.0008,
        networkSpeedBoundary: 5,
        networkSpeedUnderSpeedBoundary: 0.05,
        networkSpeedAboveSpeedBoundary: 0.2,
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
