import { CloudVirtualMachineZone, VirtualMachinePackage, Region, ChargeType, VirtualMachinePackageFamily, VirtualMachineType, Arch, BandwidthPricingTier } from './entity'
import util from 'util'
import { VmVendors } from './type'
import { client, db } from './db'
import { reconcile } from './reconcile'
import { billingJob } from './billing-task'
import { ObjectId } from 'mongodb'





async function createRegionAndZone() {

  const existed = await db.collection<Region>('Region').countDocuments()

  if (existed) {
    return
  }

  const regionList: Region[] = [
    // gzg tencent
    // {
    //   name: 'gzg.sealos.run',
    //   sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f',
    //   sealosRegionDomain: 'gzg.sealos.run',
    //   cloudProvider: VmVendors.Tencent,
    //   cloudProviderZone: ['ap-guangzhou-7']
    // },
    {
      name: '5.5',
      sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a',
      sealosRegionDomain: '5.5',
      cloudProvider: VmVendors.Tencent,
      cloudProviderZone: ['ap-guangzhou-7']
    },
  ]

  const session = client.startSession()

  try {
    session.startTransaction()
    await db.collection<Region>('Region').insertMany(regionList, { session })
    const gzg = await db.collection<Region>('Region').findOne(
      // { sealosRegionUid: '6a216614-e658-4482-a244-e4311390715f' }, // gzg
      { sealosRegionUid: '97925cb0-c8e2-4d52-8b39-d8bf0cbb414a' }, // 5.5
      { session })

    await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone').insertMany(
      [
        // gzg
        {
          regionId: gzg._id,
          cloudProviderZone: 'ap-guangzhou-6',
          name: 'Guangzhou-6'
        },
        {
          regionId: gzg._id,
          cloudProviderZone: 'ap-guangzhou-7',
          name: 'Guangzhou-7'
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

    // 按量
    const BandwidthPricingTierList: BandwidthPricingTier[] = [
      {
        minBandwidth: 0,
        maxBandwidth: 5,
        pricePerMbps: 0.05,
      },

      {
        minBandwidth: 5,
        maxBandwidth: null,
        pricePerMbps: 0.2,
      }
    ]

    // 包年包月
    const BandwidthPricingTierListPre: BandwidthPricingTier[] = [
      {
        minBandwidth: 0,
        maxBandwidth: 2,
        pricePerMbps: 14,
      },
      {
        minBandwidth: 2,
        maxBandwidth: 5,
        pricePerMbps: 17,
      },
      {
        minBandwidth: 5,
        maxBandwidth: null,
        pricePerMbps: 63,
      }
    ]


    const virtualMachinePackageFamily: VirtualMachinePackageFamily[] = [
      // 按量计费
      // guangzhou6

      // x86 计算
      // 特惠
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'TS5',
        virtualMachinePackageFamily: 'highPerformance',
        virtualMachineArch: Arch.X86_64,
        virtualMachineType: VirtualMachineType.CostEffective,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'TM5',
        virtualMachinePackageFamily: 'highMemory',
        virtualMachineArch: Arch.X86_64,
        virtualMachineType: VirtualMachineType.CostEffective,
        chargeType: ChargeType.PostPaidByHour
      },
      // 异构计算
      // GPU
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'GNV4',
        virtualMachinePackageFamily: 'NVIDIA.A10',
        virtualMachineArch: Arch.Heterogeneous,
        virtualMachineType: VirtualMachineType.GPU,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'GN7',
        virtualMachinePackageFamily: 'NVIDIA.T4',
        virtualMachineArch: Arch.Heterogeneous,
        virtualMachineType: VirtualMachineType.GPU,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'GN10Xp',
        virtualMachinePackageFamily: 'NVIDIA.V100',
        virtualMachineArch: Arch.Heterogeneous,
        virtualMachineType: VirtualMachineType.GPU,
        chargeType: ChargeType.PostPaidByHour
      },

      // guangzhou7
      // 异构计算
      // GPU



      // 包年包月
      // guangzhou6
      // x86 计算
      // 特惠
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'TS5',
        virtualMachinePackageFamily: 'highPerformance',
        virtualMachineArch: Arch.X86_64,
        virtualMachineType: VirtualMachineType.CostEffective,
        chargeType: ChargeType.PrePaid
      },
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'TM5',
        virtualMachinePackageFamily: 'highMemory',
        virtualMachineArch: Arch.X86_64,
        virtualMachineType: VirtualMachineType.CostEffective,
        chargeType: ChargeType.PrePaid
      },

    ]


    await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').insertMany(
      virtualMachinePackageFamily, { session }
    )

    // 按量
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

    // 包月
    const TS5_Pre = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'TS5', chargeType: ChargeType.PrePaid },
      { session }
    )
    const TM5_Pre = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'TM5', chargeType: ChargeType.PrePaid },
      { session }
    )

    const virtualMachinePackageList: VirtualMachinePackage[] = [
      // 按量
      // TS5
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM4',
        instancePrice: 0.15,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM8',
        instancePrice: 0.22,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE8',
        instancePrice: 0.3,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-4',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE16',
        instancePrice: 0.45,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-5',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE16',
        instancePrice: 0.6,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-6',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE32',
        instancePrice: 0.9,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-7',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE32',
        instancePrice: 1.2,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-8',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE64',
        instancePrice: 1.79,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-9',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE64',
        instancePrice: 2.39,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TS5._id,
        virtualMachinePackageName: 'sealos-10',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE128',
        instancePrice: 3.59,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      // TM5
      {
        virtualMachinePackageFamilyId: TM5._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TM5.2XLARGE64',
        instancePrice: 2.2,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TM5._id,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TM5.4XLARGE128',
        instancePrice: 4.4,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      {
        virtualMachinePackageFamilyId: TM5._id,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TM5.8XLARGE256',
        instancePrice: 8.8,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      //GNV4
      {
        virtualMachinePackageFamilyId: GNV4._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'GNV4.3XLARGE44',
        instancePrice: 9.2,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      // GN7
      {
        virtualMachinePackageFamilyId: GN7._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'GN7.2XLARGE32',
        instancePrice: 8.7,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },
      // GN10Xp
      {
        virtualMachinePackageFamilyId: GN10Xp._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'GN10Xp.2XLARGE40',
        instancePrice: 12,
        diskPerG: 0.0008,
        bandwidthPricingTiers: BandwidthPricingTierList,
        chargeType: ChargeType.PostPaidByHour
      },

      // 包月
      // TS5
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM4',
        instancePrice: 66.24,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM8',
        instancePrice: 99.36,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE8',
        instancePrice: 132.48,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-4',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE16',
        instancePrice: 198.72,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-5',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE16',
        instancePrice: 250.56,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-6',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE32',
        instancePrice: 397.44,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-7',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE32',
        instancePrice: 529.92,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-8',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE64',
        instancePrice: 794.88,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-9',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE64',
        instancePrice: 1059.84,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-10',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE128',
        instancePrice: 1589.76,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },

      // TM5
      {
        virtualMachinePackageFamilyId: TM5_Pre._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TM5.8XLARGE256',
        instancePrice: 2027.52,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TM5_Pre._id,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TM5.4XLARGE128',
        instancePrice: 1013.76,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TM5_Pre._id,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TM5.2XLARGE64',
        instancePrice: 506.88,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
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

async function createPrePaid() {
  const session = client.startSession()

  const BandwidthPricingTierListPre: BandwidthPricingTier[] = [
    {
      minBandwidth: 0,
      maxBandwidth: 2,
      pricePerMbps: 14,
    },
    {
      minBandwidth: 2,
      maxBandwidth: 5,
      pricePerMbps: 17,
    },
    {
      minBandwidth: 5,
      maxBandwidth: null,
      pricePerMbps: 63,
    }
  ]

  try {
    session.startTransaction()

    const guangzhou6 = {
      _id: new ObjectId('663f518c6aec6002bfe2f7c9')
    }

    const pre = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne({
      chargeType: ChargeType.PrePaid
    })

    console.log(pre)
    if (pre) {
      console.log('prepaid existed')
      return
    }

    const family: VirtualMachinePackageFamily[] = [
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'TS5',
        virtualMachinePackageFamily: 'highPerformance',
        virtualMachineArch: Arch.X86_64,
        virtualMachineType: VirtualMachineType.CostEffective,
        chargeType: ChargeType.PrePaid
      },
      {
        cloudVirtualMachineZoneId: guangzhou6._id,
        cloudProviderVirtualMachinePackageFamily: 'TM5',
        virtualMachinePackageFamily: 'highMemory',
        virtualMachineArch: Arch.X86_64,
        virtualMachineType: VirtualMachineType.CostEffective,
        chargeType: ChargeType.PrePaid
      },
    ]

    await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').insertMany(
      family, { session }
    )

    const TS5_Pre = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'TS5', chargeType: ChargeType.PrePaid },
      { session }
    )

    const TM5_Pre = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').findOne(
      { cloudVirtualMachineZoneId: guangzhou6._id, cloudProviderVirtualMachinePackageFamily: 'TM5', chargeType: ChargeType.PrePaid },
      { session }
    )

    const packageList: VirtualMachinePackage[] = [
      // TS5
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM4',
        instancePrice: 66.24,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TS5.MEDIUM8',
        instancePrice: 99.36,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE8',
        instancePrice: 132.48,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-4',
        cloudProviderVirtualMachinePackageName: 'TS5.LARGE16',
        instancePrice: 198.72,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-5',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE16',
        instancePrice: 250.56,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-6',
        cloudProviderVirtualMachinePackageName: 'TS5.2XLARGE32',
        instancePrice: 397.44,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-7',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE32',
        instancePrice: 529.92,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-8',
        cloudProviderVirtualMachinePackageName: 'TS5.4XLARGE64',
        instancePrice: 794.88,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-9',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE64',
        instancePrice: 1059.84,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TS5_Pre._id,
        virtualMachinePackageName: 'sealos-10',
        cloudProviderVirtualMachinePackageName: 'TS5.8XLARGE128',
        instancePrice: 1589.76,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },

      // TM5
      {
        virtualMachinePackageFamilyId: TM5_Pre._id,
        virtualMachinePackageName: 'sealos-1',
        cloudProviderVirtualMachinePackageName: 'TM5.8XLARGE256',
        instancePrice: 2027.52,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TM5_Pre._id,
        virtualMachinePackageName: 'sealos-2',
        cloudProviderVirtualMachinePackageName: 'TM5.4XLARGE128',
        instancePrice: 1013.76,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },
      {
        virtualMachinePackageFamilyId: TM5_Pre._id,
        virtualMachinePackageName: 'sealos-3',
        cloudProviderVirtualMachinePackageName: 'TM5.2XLARGE64',
        instancePrice: 506.88,
        diskPerG: 0.3,
        bandwidthPricingTiers: BandwidthPricingTierListPre,
        chargeType: ChargeType.PrePaid
      },

    ]

    await db.collection<VirtualMachinePackage>('VirtualMachinePackage').insertMany(packageList, { session })

    await session.commitTransaction()
  } catch (e) {
    console.error(e)
    await session.abortTransaction()
    throw e
  } finally {
    await session.endSession()
  }
}


export default async function (ctx: FunctionContext) {
  await createRegionAndZone()
  // await createPrePaid()
  console.info('reconcile job isRunning: ', reconcile.reconcileStateJob.isRunning())
  console.info('billing job isRunning: ', billingJob.isRunning())
  console.info('EventEmitter: ', util.inspect(reconcile.eventEmitter, { showHidden: false, depth: 2 }))
  console.info('init...')

  return { data: 'hi, laf' }
}
