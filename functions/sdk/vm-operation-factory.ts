import { VmVendors } from "../type"
import { TencentVmOperation } from "./tencent/tencent-sdk"
import { CloudVmOperation, IVmOperation } from "./vm-operation-service"

export function createVmOperationFactory(vmType: VmVendors): CloudVmOperation {
    let vmOperation: IVmOperation

    switch (vmType) {
        case VmVendors.Tencent:
            vmOperation = new TencentVmOperation()
            break
        default:
            throw new Error(`Unsupported VM type: ${vmType}`)
    }
    return new CloudVmOperation(vmOperation)
}