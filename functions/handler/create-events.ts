import { VmVendors, getVmVendor } from "../type"
import { ChargeType, CloudVirtualMachine, Phase, State } from "../entity"
import { db } from "../db"
import { TencentVmOperation } from "@/sdk/tencent/tencent-sdk"
import CONSTANTS from "../constants"
import { sleep } from "../utils"

export async function handlerCreateEvents(vm: CloudVirtualMachine) {
    const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')
    const vendor = vm.cloudProvider
    const vendorType: VmVendors = getVmVendor(vendor)
    // TODO 设置锁，解决多实例下    await TencentVmOperation.create(vm.metaData) 并发请求问题 已经解决了

    switch (vendorType) {
        case VmVendors.Tencent:
            // if waiting time is more than 5 minutes, operation failed 
            const waitingTime = Date.now() - vm.updateTime.getTime()

            if (waitingTime > CONSTANTS.TIMEOUT && vm.chargeType === ChargeType.PostPaidByHour) {

                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            state: State.Deleted,
                            phase: Phase.Deleting,
                            updateTime: new Date(),
                            lockedAt: CONSTANTS.TASK_LOCK_INIT_TIME
                        }
                    })

                return
            }

            const instanceList = await TencentVmOperation.getVmDetailsListByInstanceName(vm.instanceName)

            if (instanceList.length > 1) {
                throw new Error(`The instanceName ${vm.instanceName} has multiple instances`)
            }

            const instance = instanceList[0]

            // 包年包月机子 创建 需要等待一段时间才会有 instance
            if (!instance && vm.chargeType === ChargeType.PrePaid) {
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

            if (!instance && vm.chargeType === ChargeType.PostPaidByHour) {
                console.info(`create ${vm.instanceName}`)
                await TencentVmOperation.create(vm.metaData, vm.instanceName)
                // sleep
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

            if (!vm.instanceId) {
                await collection.updateOne(
                    { _id: vm._id },
                    {
                        $set: {
                            instanceId: instance.InstanceId,
                            updateTime: new Date(),
                            lockedAt: CONSTANTS.TASK_LOCK_INIT_TIME
                        }
                    })
                return
            }



            if (instance.InstanceState !== 'RUNNING') {
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


            await collection.updateOne({ _id: vm._id }, {
                $set: {
                    loginName: instance.DefaultLoginUser,
                    loginPort: instance.DefaultLoginPort,
                    privateIpAddresses: instance.PrivateIpAddresses,
                    publicIpAddresses: instance.PublicIpAddresses,
                    "metaData.SystemDisk": instance.SystemDisk,
                    "metaData.DataDisks": instance.DataDisks,
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
