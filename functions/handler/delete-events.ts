import { CloudVirtualMachine, Phase, State } from "../entity"
import { db } from "../db"
import { VmVendors, getVmVendor } from "../type"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"
import assert from "assert"

export async function handlerDeleteEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)
    switch (vendorType) {
        case VmVendors.Tencent:
            const cloudVmOperation = createVmOperationFactory(vendorType)
            const VmState = await cloudVmOperation.vmStatus(vm.instanceId)

            assert.strictEqual(VmState, 'STOPPED', `The instanceId ${vm.instanceId} is in ${VmState} and not in stopped, can not delete it`)

            const instanceDetails = await cloudVmOperation.getVmDetails(vm.instanceId)

            if (instanceDetails) {
                await cloudVmOperation.delete(vm.instanceId)
                return
            }

            await collection.updateOne({ _id: vm._id },
                {
                    $set: {
                        phase: Phase.Deleted,
                        updateTime: new Date()
                    }
                })

            await collection.deleteOne({
                _id: vm._id,
                state: State.Deleted,
                phase: Phase.Deleted
            })

            break

        default:
            throw new Error(`Unsupported VM type: ${vendorType}`)
    }
}
