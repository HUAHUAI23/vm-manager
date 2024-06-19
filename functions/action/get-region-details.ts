import { db } from "../db"
import { verifyBearerToken } from "../utils"
import { Arch, ChargeType, CloudVirtualMachineZone, Region, VirtualMachinePackageFamily, VirtualMachineType } from "../entity"
import { ObjectId } from "mongodb"



export interface VirtualMachineTypeDetail {
  virtualMachineType: VirtualMachineType
  virtualMachinePackageFamily: string[]
}

export interface ArchDetail {
  arch: Arch
  virtualMachineType: VirtualMachineTypeDetail[]
}

export interface ZoneDetail {
  zone: string
  arch: ArchDetail[]
}
// 区域详细信息，包含多个可用区
export class RegionDetail {
  regionId: ObjectId
  chargeType: ChargeType
  regionName: string
  zone: ZoneDetail[]
}


interface IResponse {
  data: RegionDetail[]
  error: Error
}

function sortRegionDetail(regionDetail: RegionDetail): RegionDetail {
  // 排序可用区
  regionDetail.zone.sort((a, b) => a.zone.localeCompare(b.zone))

  // 排序架构
  regionDetail.zone.forEach(zoneDetail => {
    zoneDetail.arch.sort((a, b) => {
      if (a.arch === 'x86_64') return -1
      if (b.arch === 'x86_64') return 1
      return a.arch.localeCompare(b.arch)
    })
  })

  // 排序虚拟机实例族
  regionDetail.zone.forEach(zoneDetail => {
    zoneDetail.arch.forEach(archDetail => {
      archDetail.virtualMachineType.sort((a, b) => {
        if (a.virtualMachineType === 'costEffective') return -1
        if (b.virtualMachineType === 'costEffective') return 1
        return a.virtualMachineType.localeCompare(b.virtualMachineType)
      })
    })
  })

  // 排序虚拟机机型
  regionDetail.zone.forEach(zoneDetail => {
    zoneDetail.arch.forEach(archDetail => {
      archDetail.virtualMachineType.forEach(vmTypeDetail => {
        vmTypeDetail.virtualMachinePackageFamily.sort((a, b) => {
          if (a === 'highPerformance') return -1
          if (b === 'highPerformance') return 1
          return a.localeCompare(b)
        })
      })
    })
  })

  return regionDetail
}

export default async function (ctx: FunctionContext) {
  const ok = verifyBearerToken(ctx.headers.authorization)

  if (!ok) {
    return { data: null, error: 'Unauthorized' }
  }

  const region = await db.collection<Region>('Region').findOne({ sealosRegionUid: ok.sealosRegionUid })

  if (!region) {
    return { data: null, error: 'Region not found' }
  }


  const regionList: RegionDetail[] = []

  const postPaidByHourRegionDetail: RegionDetail = {
    regionId: region._id,
    chargeType: ChargeType.PostPaidByHour,
    regionName: region.name,
    zone: []
  }

  const prePaidRegionDetail: RegionDetail = {
    regionId: region._id,
    chargeType: ChargeType.PrePaid,
    regionName: region.name,
    zone: []
  }

  const zones = await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone').
    find({ regionId: region._id }).toArray()

  for (const zone of zones) {
    const postPaidByHourZoneDetail = await getZoneDetails(zone, ChargeType.PostPaidByHour)
    const prePaidZoneDetail = await getZoneDetails(zone, ChargeType.PrePaid)


    if (zone.name === 'Guangzhou-7') {
      continue
    }

    postPaidByHourRegionDetail.zone.push(postPaidByHourZoneDetail)
    prePaidRegionDetail.zone.push(prePaidZoneDetail)

  }

  // sort

  regionList.push(sortRegionDetail(prePaidRegionDetail))
  regionList.push(sortRegionDetail(postPaidByHourRegionDetail))

  const data: IResponse = {
    data: regionList,
    error: null
  }

  return data

}

async function getZoneDetails(zone: CloudVirtualMachineZone, chargeType: ChargeType) {
  interface ArchWithType {
    virtualMachineArch: Arch
    virtualMachineTypes: VirtualMachineType[]
  }
  const zoneDetail: ZoneDetail = {
    zone: zone.name,
    arch: []
  }


  const archWithTypes: ArchWithType[] = (await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').aggregate([
    {
      $match: {
        cloudVirtualMachineZoneId: zone._id,
        chargeType: chargeType
      },
    },
    {
      $group: {
        _id: "$virtualMachineArch",  // 根据架构进行分组
        virtualMachineTypes: { $addToSet: "$virtualMachineType" }  // 收集每个架构对应的虚拟机类型到集合中，使用 $addToSet 避免重复
      }
    },
    {
      $project: {
        _id: 0,  // 不显示 _id 字段
        virtualMachineArch: "$_id",  // 将 _id 重命名为 virtualMachineArch
        virtualMachineTypes: 1       // 显示虚拟机类型列表
      }
    }
  ]).toArray()) as ArchWithType[]

  for (const archWithType of archWithTypes) {
    const archDetail: ArchDetail = {
      arch: archWithType.virtualMachineArch,
      virtualMachineType: []
    }
    for (const virtualMachineType of archWithType.virtualMachineTypes) {
      const virtualMachineTypeDetail: VirtualMachineTypeDetail = {
        virtualMachineType: virtualMachineType,
        virtualMachinePackageFamily: (
          await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily')
            .distinct('virtualMachinePackageFamily',
              {
                cloudVirtualMachineZoneId: zone._id,
                virtualMachineArch: archWithType.virtualMachineArch,
                virtualMachineType: virtualMachineType,
                chargeType: chargeType
              }
            )
        )
      }
      archDetail.virtualMachineType.push(virtualMachineTypeDetail)
    }
    zoneDetail.arch.push(archDetail)
  }
  return zoneDetail
}

