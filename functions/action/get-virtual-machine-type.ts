import { db } from "../db"
import { TencentVmOperation } from "../sdk/tencent/tencent-sdk"
import { VmVendors, getVmVendor } from "../type"
import { verifyBearerToken } from "../utils"
import { Region, VirtualMachinePackageList } from "@/entity"
import { InstanceTypeQuotaItem } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"

interface IResponse {
    data: VirtualMachineSet[]
    error: Error
}
enum Status {
    Available = 'available',
    Unavailable = 'unavailable'
}

interface VirtualMachineSet {
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

function tencentMapAndTransform(vmPackages: VirtualMachinePackageList[], instanceTypes: InstanceTypeQuotaItem[]): VirtualMachineSet[] {
    return vmPackages.map(vmPackage => {
        const matchedInstanceType = instanceTypes.find(instanceType => instanceType.InstanceType === vmPackage.cloudProviderVirtualMachinePackageName)
        if (!matchedInstanceType) {
            throw new Error(`No matching instance type found for ${vmPackage.cloudProviderVirtualMachinePackageName}`)
        }
        return {
            cpu: matchedInstanceType.Cpu,
            memory: matchedInstanceType.Memory,
            gpu: matchedInstanceType.Gpu,
            virtualMachinePackageFamily: vmPackage.virtualMachinePackageFamily,
            virtualMachinePackageName: vmPackage.virtualMachinePackageName,
            instancePrice: vmPackage.instancePrice,
            diskPerG: vmPackage.diskPerG,
            networkSpeedBoundary: vmPackage.networkSpeedBoundary,
            networkSpeedUnderSpeedBoundaryPerHour: vmPackage.networkSpeedUnderSpeedBoundaryPerHour,
            networkSpeedAboveSpeedBoundaryPerHour: vmPackage.networkSpeedAboveSpeedBoundaryPerHour,
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

    const vendorType = getVmVendor(region.cloudProvider)

    switch (vendorType) {
        case VmVendors.Tencent:
            const vmTypeList = await
                TencentVmOperation.describeZoneInstanceConfigInfos()

            const virutalMachinePackageList = await db.collection<VirtualMachinePackageList>('VirutalMachinePackageList').
                find({
                    sealosRegionUid: region.sealosRegionUid,
                    cloudProvider: region.cloudProvider,
                    cloudProviderZone: 'ap-guangzhou-6'
                }).toArray()

            const virtualMachineSet: VirtualMachineSet[] = tencentMapAndTransform(virutalMachinePackageList, vmTypeList)

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