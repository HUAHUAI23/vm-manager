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
    const zoneDetail = await getZoneDetails(zone)

    if (zone.name === 'Guangzhou-7') {
      continue
    }

    postPaidByHourRegionDetail.zone.push(zoneDetail)
    prePaidRegionDetail.zone.push(zoneDetail)
  }

  regionList.push(postPaidByHourRegionDetail)
  // regionList.push(prePaidRegionDetail)

  const data: IResponse = {
    data: regionList,
    error: null
  }

  return data

}

async function getZoneDetails(zone: CloudVirtualMachineZone) {
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
        virtualMachineType,
        virtualMachinePackageFamily: (await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily').distinct('virtualMachinePackageFamily', {
          cloudVirtualMachineZoneId: zone._id,
          virtualMachineArch: archWithType.virtualMachineArch,
          virtualMachineType
        }))
      }
      archDetail.virtualMachineType.push(virtualMachineTypeDetail)
    }
    zoneDetail.arch.push(archDetail)
  }
  return zoneDetail
}

