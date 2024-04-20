import { CloudVirtualMachine, Phase, State } from "../entity"
import { db } from "../db"
import { VmVendors, getVmVendor } from "../type"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"
import { TASK_LOCK_INIT_TIME, sleepTime } from "../constants"
import { sleep } from "../utils"

export async function handlerDeleteEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)
    switch (vendorType) {
        case VmVendors.Tencent:
            console.log(2222)
            const instanceDetails = await TencentVmOperation.getVmDetailsByInstanceName(vm.instanceName)

            if (
                instanceDetails &&
                (instanceDetails.LatestOperation !== 'TerminateInstances'
                    || instanceDetails.LatestOperationState === 'FAILED')
            ) {
                console.log(333)
                await TencentVmOperation.delete(instanceDetails.InstanceId)

                await sleep(sleepTime)

                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            lockedAt: TASK_LOCK_INIT_TIME
                        }
                    }
                )

                return
            }

            if (instanceDetails) {

                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            lockedAt: TASK_LOCK_INIT_TIME
                        }
                    }
                )

                return
            }

            await collection.updateOne({ _id: vm._id },
                {
                    $set: {
                        phase: Phase.Deleted,
                        updateTime: new Date(),
                        lockedAt: TASK_LOCK_INIT_TIME
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
