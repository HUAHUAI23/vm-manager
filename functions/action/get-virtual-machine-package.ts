import { db } from "../db"
import { TencentVmOperation } from "../sdk/tencent/tencent-sdk"
import { VmVendors, getVmVendor } from "../type"
import { verifyBearerToken } from "../utils"
import { ChargeType, Region, VirtualMachinePackageList } from "../entity"
import { InstanceTypeQuotaItem } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"

interface IResponse {
    data: VirtualMachinePackage[]
    error: Error
}
enum Status {
    Available = 'available',
    Unavailable = 'unavailable'
}

interface VirtualMachinePackage {
    cpu?: number
    memory?: number
    gpu?: number
    virtualMachinePackageFamily: string
    virtualMachinePackageName: string
    instancePrice: number
    diskPerG: number
    networkSpeedBoundary: number
    networkSpeedUnderSpeedBoundaryPerHour: number
    networkSpeedAboveSpeedBoundaryPerHour: number
    status: Status
}

function tencentMapAndTransform(virtualMachinePackages: VirtualMachinePackageList[], instanceTypes: InstanceTypeQuotaItem[]): VirtualMachinePackage[] {
    return virtualMachinePackages.map(virtualMachinePackage => {
        const matchedInstanceType = instanceTypes.find(instanceType => instanceType.InstanceType === virtualMachinePackage.cloudProviderVirtualMachinePackageName)

        if (!matchedInstanceType) {
            throw new Error(`No matching instance type found for ${virtualMachinePackage.cloudProviderVirtualMachinePackageName}`)
        }

        return {
            cpu: matchedInstanceType.Cpu,
            memory: matchedInstanceType.Memory,
            gpu: matchedInstanceType.Gpu,
            virtualMachinePackageFamily: virtualMachinePackage.virtualMachinePackageFamily,
            virtualMachinePackageName: virtualMachinePackage.virtualMachinePackageName,
            instancePrice: virtualMachinePackage.instancePrice,
            diskPerG: virtualMachinePackage.diskPerG,
            networkSpeedBoundary: virtualMachinePackage.networkSpeedBoundary,
            networkSpeedUnderSpeedBoundaryPerHour: virtualMachinePackage.networkSpeedUnderSpeedBoundaryPerHour,
            networkSpeedAboveSpeedBoundaryPerHour: virtualMachinePackage.networkSpeedAboveSpeedBoundaryPerHour,
            status: matchedInstanceType.Status === "SELL" ? Status.Available : Status.Unavailable
        }

    })
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

    const vendorType = getVmVendor(region.cloudProvider)

    switch (vendorType) {
        case VmVendors.Tencent:
            const vmTypeList = await
                TencentVmOperation.describeZoneInstanceConfigInfos()

            const virtualMachinePackageList = await db.collection<VirtualMachinePackageList>('VirtualMachinePackageList').
                find({
                    sealosRegionUid: region.sealosRegionUid,
                    cloudProvider: region.cloudProvider,
                    cloudProviderZone: 'ap-guangzhou-6',
                    chargeType: ChargeType.PostPaidByHour
                }).toArray()

            const virtualMachineSet: VirtualMachinePackage[] = tencentMapAndTransform(virtualMachinePackageList, vmTypeList)

            virtualMachineSet.sort((a, b) => {
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
                data: virtualMachineSet,
                error: null
            }

            return data

        default:
            throw new Error(`Unsupported vendor type: ${vendorType}`)

    }

}