import { VmVendors, getVmVendor } from "../type"
import { db } from "../db"
import { CloudVirtualMachine, Phase, State } from "../entity"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import { TencentVmOperation } from "../sdk/tencent/tencent-sdk"
import CONSTANTS from "../constants"
import { sleep } from "../utils"

export async function handleRestartEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)
    switch (vendorType) {
        case VmVendors.Tencent:

            const instanceDetails: Instance = await TencentVmOperation.getVmDetails(vm.instanceId)

            if (!instanceDetails) {
                throw new Error(`The instanceName ${vm.instanceName} not found in Tencent, can not start it`)
            }

            if (instanceDetails.LatestOperation !== 'RebootInstances' || instanceDetails.LatestOperationState === 'FAILED') {
                console.info(`restart ${vm.instanceName}`)
                await TencentVmOperation.restart(vm.instanceId)

                await sleep(CONSTANTS.SLEEP_TIME)

                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            lockedAt: CONSTANTS.TASK_LOCK_INIT_TIME
                        }
                    }
                )

                return
            }

            if (instanceDetails.InstanceState !== 'RUNNING') {
                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            lockedAt: CONSTANTS.TASK_LOCK_INIT_TIME
                        }
                    }
                )

                return
            }

            await collection.updateOne({ _id: vm._id },
                {
                    $set:
                    {
                        state: State.Running,
                        phase: Phase.Started,
                        updateTime: new Date(),
                        lockedAt: CONSTANTS.TASK_LOCK_INIT_TIME
                    }
                })

            break

        default:
            throw new Error(`Unsupported VM type: ${vendorType}`)
    }
}
