import { CloudVirtualMachine, Phase, State } from "../entity"
import { db } from "../db"
import { VmVendors, getVmVendor } from "../type"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"

export async function handlerStopEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)
    switch (vendorType) {
        case VmVendors.Tencent:
            console.log(222)

            const instanceDetails: Instance = await TencentVmOperation.getVmDetails(vm.instanceId)

            if (!instanceDetails) {
                throw new Error(`The instanceId ${vm.instanceId} not found in Tencent, can not stop it`)
            }

            if (instanceDetails.LatestOperation !== 'StopInstances' || instanceDetails.LatestOperationState === 'FAILED') {
                console.log(333)
                await TencentVmOperation.stop(vm.instanceId)
            }

            if (instanceDetails.InstanceState !== 'STOPPED') {
                return
            }

            await collection.updateOne({ _id: vm._id },
                {
                    $set: {
                        phase: Phase.Stopped,
                        updateTime: new Date()
                    }
                })

            break

        default:
            throw new Error(`Unsupported VM type: ${vendorType}`)
    }
}
