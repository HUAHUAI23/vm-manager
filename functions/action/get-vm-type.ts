import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"
import { getVmType } from "../type"
import { verifyBearerToken } from "../utils"

interface IRequestBody {
    cloudProvider: string
}

interface IResponse {
    data: TencentVmType[]
    error: Error
}

interface vmType {
    CPU?: number
    Memory?: number
    GPU?: number
}

interface TencentVmType extends vmType {
    InstanceType?: string
    InstanceFamily?: string
    Zone?: string
    GpuCount?: number
    FPGA?: number

}

export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.token)

    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }

    const vmType = getVmType('tencent')
    const cloudVmOperation = createVmOperationFactory(vmType)

    const vmTypeList = await
        (<TencentVmOperation>cloudVmOperation.vmOperation).getInstanceTypeList()

    const data: IResponse = {
        data: vmTypeList,
        error: null
    }
    return data
}