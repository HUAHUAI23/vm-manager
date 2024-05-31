import { ChargeType, CloudVirtualMachine, Phase } from "../entity"
import { db } from "../db"
import { StoppedMode, VmVendors, getVmVendor } from "../type"
import { Instance } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"
import CONSTANTS from "../constants"
import { sleep } from "../utils"

export async function handlerStopEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)
    switch (vendorType) {
        case VmVendors.Tencent:
            console.log(222)

            const instanceDetails: Instance = await TencentVmOperation.getVmDetails(vm.instanceId)

            if (!instanceDetails) {
                throw new Error(`The instanceName ${vm.instanceName} not found in Tencent, can not stop it`)
            }

            if (instanceDetails.LatestOperation !== 'StopInstances' || instanceDetails.LatestOperationState === 'FAILED') {
                console.log(333)
                if (vm.chargeType === ChargeType.PostPaidByHour) {
                    await TencentVmOperation.stop(vm.instanceId)
                }

                if (vm.chargeType === ChargeType.PrePaid) {
                    await TencentVmOperation.stop(vm.instanceId, StoppedMode.KEEP_CHARGING)
                }

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

            if (instanceDetails.InstanceState !== 'STOPPED') {

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
                    $set: {
                        phase: Phase.Stopped,
                        updateTime: new Date(),
                        lockedAt: CONSTANTS.TASK_LOCK_INIT_TIME,
                    }
                })

            break

        default:
            throw new Error(`Unsupported VM type: ${vendorType}`)
    }
}
