import { VMTypes } from "../type"
import { TencentVmOperation } from "./tencent/tencent-sdk"
import { CloudVmOperation, IVmOperation } from "./vm-operation-service"

export function createVmOperationFactory(vmType: VMTypes): CloudVmOperation {
    let vmOperation: IVmOperation

    switch (vmType) {
        case VMTypes.Tencent:
            vmOperation = new TencentVmOperation()
            break
        default:
            throw new Error(`Unsupported VM type: ${vmType}`)
    }
    return new CloudVmOperation(vmOperation)
}