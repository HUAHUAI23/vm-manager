import { VMTypes, getVmType } from "../type"
import { db } from "../db"
import { CloudVirtualMachine, Phase, State } from "../entity"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"

export async function handleRestartEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vmType: VMTypes = getVmType(vendor)
    switch (vmType) {
        case VMTypes.Tencent:
            const cloudVmOperation = createVmOperationFactory(vmType)

            const vmStatus = await cloudVmOperation.vmStatus(vm.instanceId)

            if (vmStatus !== 'RUNNING') {
                console.log(`The instanceId ${vm.instanceId} is in ${vmStatus} and not in RUNNING, cannot restart it`)
                return
            }

            let instanceDetails: Instance = await cloudVmOperation.getVmDetails(vm.instanceId)

            // 连续两次重启，第二次重启，不会执行 cloudVmOperation.restart(vm.instanceId) 
            // 状态直接变成 Running Started
            // 无法完成连续重启操作
            if (instanceDetails.LatestOperation !== 'RebootInstances') {
                await cloudVmOperation.restart(vm.instanceId)
            }

            instanceDetails = await cloudVmOperation.getVmDetails(vm.instanceId)

            if (instanceDetails.LatestOperation === 'RebootInstances' && instanceDetails.LatestOperationState === 'SUCCESS') {
                await collection.updateOne({ _id: vm._id }, { $set: { state: State.Running, phase: Phase.Started } })
                return
            }

            break

        default:
            throw new Error(`Unsupported VM type: ${vmType}`)
    }


}
