import { VMTypes, getVmType } from "../type"
import { CloudVirtualMachine, Phase, TencentMeta } from "../entity"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"
import { db } from "../db"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"

export async function handlerCreateEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vmType: VMTypes = getVmType(vendor)

    switch (vmType) {
        case VMTypes.Tencent:
            const cloudVmOperation = createVmOperationFactory(vmType)

            if (!vm.instanceId) {
                const instanceId = await cloudVmOperation.create(vm.metaData)
                await collection.updateOne({ _id: vm._id }, { $set: { instanceId } })
                return
            }

            const instanceDetails: Instance = await cloudVmOperation.getVmDetails(vm.instanceId)

            if (!instanceDetails) {
                throw new Error(`The instanceId ${vm.instanceId} not found in Tencent`)
            }

            if (instanceDetails.InstanceState === 'RUNNING') {
                const metaData = <TencentMeta>vm.metaData

                metaData.SystemDisk = instanceDetails.SystemDisk
                metaData.DataDisks = instanceDetails.DataDisks
                vm.loginName = instanceDetails.DefaultLoginUser
                vm.loginPort = instanceDetails.DefaultLoginPort
                vm.privateIpAddresses = instanceDetails.PrivateIpAddresses
                vm.publicIpAddresses = instanceDetails.PublicIpAddresses

                await collection.updateOne({ _id: vm._id }, {
                    $set: {
                        metaData,
                        phase: Phase.Started
                    }
                })
            }

            break
        default:
            throw new Error(`Unsupported VM type: ${vmType}`)
    }
}
