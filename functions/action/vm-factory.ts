import { VMTypes } from "../type"
import { IVM } from "./vm"
import { CloudVm } from "./vm"
import { TencentVm } from "./tencent/tencent-vm"

export function createCloudVm(vmType: VMTypes): CloudVm {
    let vm: IVM

    switch (vmType) {
        case VMTypes.Tencent:
            vm = new TencentVm()
            break
        // 可以添加更多的case来处理不同的VM类型
        // case VMTypes.VendorB:
        //   vm = new VendorBVM();
        //   break;
        // ...
        default:
            throw new Error(`Unsupported VM type: ${vmType}`)
    }
    return new CloudVm(vm)
}