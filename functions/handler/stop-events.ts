import { CloudVirtualMachine, Phase } from "../entity"
import { db } from "../db"
import { VmVendors, getVmVendor } from "../type"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import assert from "assert"

export async function handlerStopEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vmType: VmVendors = getVmVendor(vendor)
    switch (vmType) {
        case VmVendors.Tencent:
            const cloudVmOperation = createVmOperationFactory(vmType)
            const instanceDetails: Instance = await cloudVmOperation.getVmDetails(vm.instanceId)

            if (!instanceDetails) {
                throw new Error(`The instanceId ${vm.instanceId} not found in Tencent, can not stop it`)
            }

            if (instanceDetails.InstanceState === 'STOPPED') {
                await collection.updateOne({ _id: vm._id }, { $set: { phase: Phase.Stopped } })
                return
            }

            assert.strictEqual(instanceDetails.InstanceState, 'RUNNING', `The instanceId ${instanceDetails.InstanceId} is in ${instanceDetails.InstanceState} and not in running, can not stop it`)

            await cloudVmOperation.stop(vm.instanceId)
            break

        default:
            throw new Error(`Unsupported VM type: ${vmType}`)
    }
}
