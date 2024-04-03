import { CloudVirtualMachine, Phase, State } from "../entity"
import { db } from "../db"
import { VMTypes, getVmType } from "../type"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"

export async function handlerDeleteEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vmType: VMTypes = getVmType(vendor)
    switch (vmType) {
        case VMTypes.Tencent:
            const cloudVmOperation = createVmOperationFactory(vmType)
            const VmState = await cloudVmOperation.vmStatus(vm.instanceId)

            if (VmState !== 'STOPPED') {
                throw new Error(`The instanceId ${vm.instanceId} is in ${VmState} and not in stopped, can not delete it`)
            }

            const instanceDetails = await cloudVmOperation.getVmDetails(vm.instanceId)

            if (instanceDetails) {
                await cloudVmOperation.delete(vm.instanceId)
                return
            }

            await collection.updateOne({ _id: vm._id }, { $set: { phase: Phase.Deleted } })

            await collection.deleteOne({ _id: vm._id, state: State.Deleted, phase: Phase.Deleted })

            break

        default:
            break
    }
}
