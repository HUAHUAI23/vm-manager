import { CloudVirtualMachine, Phase } from "../entity"
import { db } from "../db"
import { VmVendors, getVmVendor } from "../type"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"
import { TASK_LOCK_INIT_TIME, sleepTime } from "../constants"
import { sleep } from "../utils"

export async function handlerStartEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)
    switch (vendorType) {
        case VmVendors.Tencent:

            console.log(111)

            const instanceDetails: Instance = await TencentVmOperation.getVmDetails(vm.instanceId)
            if (!instanceDetails) {
                throw new Error(`The instanceName ${vm.instanceName} not found in Tencent, can not start it`)
            }

            if (instanceDetails.LatestOperation !== 'StartInstances' || instanceDetails.LatestOperationState === 'FAILED') {
                console.log(333)
                await TencentVmOperation.start(vm.instanceId)

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

            if (instanceDetails.InstanceState !== 'RUNNING') {
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

            await collection.updateOne(
                { _id: vm._id },
                {
                    $set: {
                        phase: Phase.Started,
                        updateTime: new Date(),
                        lockedAt: TASK_LOCK_INIT_TIME,
                    }
                })

            break

        default:
            throw new Error(`Unsupported VM type: ${vendorType}`)
    }

}
