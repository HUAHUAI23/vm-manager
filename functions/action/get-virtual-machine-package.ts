import { db } from "../db"
import { TencentVmOperation } from "../sdk/tencent/tencent-sdk"
import { VmVendors, getVmVendor } from "../type"
import { verifyBearerToken } from "../utils"
import { Arch, BandwidthPricingTier, ChargeType, CloudVirtualMachineZone, Region, VirtualMachinePackage, VirtualMachinePackageFamily, VirtualMachineType } from "../entity"
import { InstanceTypeQuotaItem } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"

interface IResponse {
    data: sealosVirtualMachinePackage[]
    error: Error
}
interface IRequestBody {
    zone: string
    virtualMachinePackageFamily: string
    virtualMachineArch: Arch
    virtualMachineType: VirtualMachineType
    chargeType: ChargeType
}

enum Status {
    Available = 'available',
    Unavailable = 'unavailable'
}

interface sealosVirtualMachinePackage {
    cpu?: number
    memory?: number
    gpu?: number
    virtualMachinePackageFamily: string
    virtualMachinePackageName: string
    instancePrice: number
    diskPerG: number
    bandwidthPricingTiers: BandwidthPricingTier[]
    chargeType: ChargeType
    status: Status
}

function tencentMapAndTransform(virtualMachinePackages: VirtualMachinePackage[], virtualMachinePackageFamilyName: string, instanceTypes: InstanceTypeQuotaItem[]): sealosVirtualMachinePackage[] {
    return virtualMachinePackages.map(virtualMachinePackage => {
        const matchedInstanceType = instanceTypes.find(instanceType => instanceType.InstanceType === virtualMachinePackage.cloudProviderVirtualMachinePackageName)

        if (!matchedInstanceType) {
            throw new Error(`No matching instance type found for ${virtualMachinePackage.cloudProviderVirtualMachinePackageName}`)
        }

        return {
            cpu: matchedInstanceType.Cpu,
            memory: matchedInstanceType.Memory,
            gpu: matchedInstanceType.Gpu,
            virtualMachinePackageFamily: virtualMachinePackageFamilyName,
            virtualMachinePackageName: virtualMachinePackage.virtualMachinePackageName,
            instancePrice: virtualMachinePackage.instancePrice,
            diskPerG: virtualMachinePackage.diskPerG,
            bandwidthPricingTiers: virtualMachinePackage.bandwidthPricingTiers,
            chargeType: virtualMachinePackage.chargeType,
            status: matchedInstanceType.Status === "SELL" ? Status.Available : Status.Unavailable

        }

    })
}



export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.authorization)

    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }
    const body: IRequestBody = ctx.request.body


    const region = await db.collection<Region>('Region').findOne({ sealosRegionUid: ok.sealosRegionUid })

    if (!region) {
        return { data: null, error: 'Region not found' }
    }

    const vendorType = getVmVendor(region.cloudProvider)

    const cloudVirtualMachineZone = await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone')
        .findOne({ regionId: region._id, name: body.zone })

    if (!cloudVirtualMachineZone) {
        return { data: null, error: 'CloudVirtualMachineZone not found' }
    }

    const chargeType = ChargeType.PostPaidByHour
    const virtualMachinePackageFamily = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily')
        .findOne({
            cloudVirtualMachineZoneId: cloudVirtualMachineZone._id,
            virtualMachinePackageFamily: body.virtualMachinePackageFamily,
            virtualMachineType: body.virtualMachineType,
            virtualMachineArch: body.virtualMachineArch,
            chargeType: chargeType
        })

    if (!virtualMachinePackageFamily) {
        return { data: null, error: 'virtualMachinePackageFamily not found' }
    }

    switch (vendorType) {
        case VmVendors.Tencent:
            const vmTypeList = await
                TencentVmOperation.describeZoneInstanceConfigInfos(cloudVirtualMachineZone.cloudProviderZone,
                    virtualMachinePackageFamily.cloudProviderVirtualMachinePackageFamily,
                    chargeType)

            const virtualMachinePackageList = await db.collection<VirtualMachinePackage>('VirtualMachinePackage').
                find({
                    virtualMachinePackageFamilyId: virtualMachinePackageFamily._id,
                    chargeType: chargeType
                }).toArray()

            const sealosVirtualMachineList: sealosVirtualMachinePackage[] =
                tencentMapAndTransform(virtualMachinePackageList, virtualMachinePackageFamily.virtualMachinePackageFamily, vmTypeList)

            sealosVirtualMachineList.sort((a, b) => {
                // 首先按 CPU 排序
                if (a.cpu !== b.cpu) {
                    return a.cpu - b.cpu
                }
                // 如果 CPU 相同，再按 Memory 排序
                if (a.memory !== b.memory) {
                    return a.memory - b.memory
                }
                // 如果 CPU 和 Memory 都相同，最后按 GPU 排序
                return a.gpu - b.gpu
            })

            const data: IResponse = {
                data: sealosVirtualMachineList,
                error: null
            }

            return data

        default:
            throw new Error(`Unsupported vendor type: ${vendorType}`)

    }

}