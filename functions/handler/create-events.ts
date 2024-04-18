import { VmVendors, getVmVendor } from "../type"
import { CloudVirtualMachine, Phase, State } from "../entity"
import { db } from "../db"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"

export async function handlerCreateEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)

    switch (vendorType) {
        case VmVendors.Tencent:
            console.log(222)
            // if waiting time is more than 3 minutes, operation failed 
            const waitingTime = Date.now() - vm.updateTime.getTime()
            if (waitingTime > 1000 * 60 * 5) {
                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            state: State.Deleted,
                            phase: Phase.Deleting,
                            updateTime: new Date()
                        }
                    })
            }

            const instanceList = await TencentVmOperation.getVmDetailsListByInstanceName(vm.instanceName)

            if (instanceList.length > 1) {
                throw new Error(`The instanceName ${vm.instanceName} has multiple instances`)
            }

            const instance = instanceList[0]

            if (!instance) {
                console.log(333)
                await TencentVmOperation.create(vm.metaData)
                return
            }

            if (!vm.instanceId) {
                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            instanceId: instance.InstanceId,
                            updateTime: new Date()
                        }
                    })
                return
            }



            if (instance.InstanceState !== 'RUNNING') {
                return
            }


            await collection.updateOne({ _id: vm._id }, {
                $set: {
                    loginName: instance.DefaultLoginUser,
                    loginPort: instance.DefaultLoginPort,
                    privateIpAddresses: instance.PrivateIpAddresses,
                    publicIpAddresses: instance.PublicIpAddresses,
                    "metaData.SystemDisk": instance.SystemDisk,
                    "metaData.DataDisks": instance.DataDisks,
                    phase: Phase.Started,
                    updateTime: new Date()
                }
            })

            break

        default:
            throw new Error(`Unsupported VM type: ${vendorType}`)
    }
}
