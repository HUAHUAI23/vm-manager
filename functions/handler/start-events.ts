import { CloudVirtualMachine, Phase } from "../entity"
import { db } from "../db"
import { VMTypes, getVmType } from "../type"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import assert from "assert"

export async function handlerStartEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vmType: VMTypes = getVmType(vendor)
    switch (vmType) {
        case VMTypes.Tencent:
            const cloudVmOperation = createVmOperationFactory(vmType)
            const instanceDetails: Instance = await cloudVmOperation.getVmDetails(vm.instanceId)

            if (!instanceDetails) {
                throw new Error(`The instanceId ${vm.instanceId} not found in Tencent, can not start it`)
            }

            if (instanceDetails.InstanceState === 'RUNNING') {
                await collection.updateOne({ _id: vm._id }, { $set: { phase: Phase.Started } })
                return
            }

            assert.strictEqual(instanceDetails.InstanceState, 'STOPPED', `The instanceId ${instanceDetails.InstanceId} is in ${instanceDetails.InstanceState} and not in stopped, can not start it`)

            await cloudVmOperation.start(vm.instanceId)
            break

        default:
            throw new Error(`Unsupported VM type: ${vmType}`)
    }

}
