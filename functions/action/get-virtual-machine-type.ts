import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"
import { VmVendors, getVmVendor } from "../type"
import { verifyBearerToken } from "../utils"
import { validateDTO } from '../utils'


interface IRequestBody {
    cloudProvider: string
}

interface IResponse {
    data: VirtualMachineSet[]
    error: Error
}

interface VirtualMachineSet {
    CPU?: number
    Memory?: number
    GPU?: number
}

function sortVirtualMachineSet(virtualMachineSet: VirtualMachineSet[]): VirtualMachineSet[] {
    return virtualMachineSet.sort((a, b) => {
        if (a.CPU !== b.CPU) {
            return (a.CPU || 0) - (b.CPU || 0)
        }
        if (a.Memory !== b.Memory) {
            return (a.Memory || 0) - (b.Memory || 0)
        }
        return (a.GPU || 0) - (b.GPU || 0)
    })
}

const iRequestBodySchema = {
    cloudProvider: (value: any): boolean => Object.values(VmVendors).includes(value)
}

export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.token)
    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }

    const irequestBody: IRequestBody = ctx.request.body

    try {
        validateDTO(irequestBody, iRequestBodySchema)
    } catch (error) {
        return { data: null, error: error.message }
    }

    const vendor = irequestBody.cloudProvider

    const vendorType = getVmVendor(vendor)

    switch (vendorType) {
        case VmVendors.Tencent:
            const cloudVmOperation = createVmOperationFactory(vendorType)

            const vmTypeList = await
                (<TencentVmOperation>cloudVmOperation.vmOperation).getInstanceTypeDetailList()

            const virtualMachineSet: VirtualMachineSet[] = vmTypeList.map((vmType) => ({
                CPU: vmType.CPU,
                Memory: vmType.Memory,
                GPU: vmType.GPU
            }))

            sortVirtualMachineSet(virtualMachineSet)

            const data: IResponse = {
                data: virtualMachineSet,
                error: null
            }

            return data

        default:
            throw new Error(`Unsupported vendor type: ${vendorType}`)

    }

}