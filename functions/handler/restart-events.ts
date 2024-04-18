import { VmVendors, getVmVendor } from "../type"
import { db } from "../db"
import { CloudVirtualMachine, Phase, State } from "../entity"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"

export async function handleRestartEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)
    switch (vendorType) {
        case VmVendors.Tencent:

            console.log(111)

            const instanceDetails: Instance = await TencentVmOperation.getVmDetails(vm.instanceId)

            if (!instanceDetails) {
                throw new Error(`The instanceId ${vm.instanceId} not found in Tencent, can not start it`)
            }

            if (instanceDetails.LatestOperation !== 'RebootInstances' || instanceDetails.LatestOperationState === 'FAILED') {
                console.log(333)
                await TencentVmOperation.restart(vm.instanceId)
            }

            if (instanceDetails.InstanceState !== 'RUNNING') {
                return
            }

            await collection.updateOne({ _id: vm._id },
                {
                    $set:
                    {
                        state: State.Running,
                        phase: Phase.Started,
                        updateTime: new Date()
                    }
                })

            break

        default:
            throw new Error(`Unsupported VM type: ${vendorType}`)
    }
}
