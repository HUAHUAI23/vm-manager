import { VmVendors, getVmVendor } from "../type"
import { CloudVirtualMachine, Phase, TencentMeta } from "../entity"
import { createVmOperationFactory } from "../sdk/vm-operation-factory"
import { db } from "../db"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"

export async function handlerCreateEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)

    switch (vendorType) {
        case VmVendors.Tencent:
            const cloudVmOperation = createVmOperationFactory(vendorType)

            const found = await (<TencentVmOperation>cloudVmOperation.vmOperation).getVmDetailsByInstanceName(vm.instanceName)

            if (!found) {
                await cloudVmOperation.create(vm.metaData)
                return
            }

            if (!vm.instanceId) {
                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            instanceId: found.InstanceId,
                            updateTime: new Date()
                        }
                    })
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
                        phase: Phase.Started,
                        updateTime: new Date()
                    }
                })
            }

            break

        default:
            throw new Error(`Unsupported VM type: ${vendorType}`)
    }
}
