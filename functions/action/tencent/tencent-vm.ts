import { db } from '../../db'
import { IntermediatePhases, IntermediateStates, State, CloudVirtualMachine, Phase, TencentCloudVirtualMachine } from "../../entity"
import assert from "assert"

export class TencentVm {
  static async create(vm: TencentCloudVirtualMachine): Promise<void> {
    await db.collection<CloudVirtualMachine>('CloudVirtualMachine').insertOne(vm)
  }

  static async start(tencentVm: TencentCloudVirtualMachine): Promise<void> {
    // 检查状态是否为中间态
    assert.strictEqual(IntermediateStates.includes(tencentVm.state), false,
      `The virtual machine is in an ${tencentVm.state} state and cannot be start.`)

    assert.strictEqual(IntermediatePhases.includes(tencentVm.phase), false,
      `The virtual machine is in an ${tencentVm.phase} state and cannot be start.`)

    // 检查 phase 是否为 Stopped
    assert.strictEqual(tencentVm.phase, Phase.Stopped, 'The virtual machine is not stopped and cannot be start.')

    await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').updateOne(
      { _id: tencentVm._id },
      {
        $set: {
          state: State.Running,
          phase: Phase.Starting,
          updateTime: new Date()
        }
      })
  }

  static async stop(tencentVm: TencentCloudVirtualMachine): Promise<void> {
    // 检查状态是否为中间态
    assert.strictEqual(IntermediateStates.includes(tencentVm.state), false,
      `The virtual machine is in an ${tencentVm.state} state and cannot be stop.`)

    assert.strictEqual(IntermediatePhases.includes(tencentVm.phase), false,
      `The virtual machine is in an ${tencentVm.phase} state and cannot be stop.`)

    // 检查 phase 是否为 Started
    assert.strictEqual(tencentVm.phase, Phase.Started, 'The virtual machine is not started and cannot be stop.')

    await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').updateOne(
      { _id: tencentVm._id },
      {
        $set: {
          state: State.Stopped,
          phase: Phase.Stopping,
          updateTime: new Date()
        }
      })
  }

  static async restart(tencentVm: TencentCloudVirtualMachine): Promise<void> {
    // 检查状态是否为中间态
    assert.strictEqual(IntermediateStates.includes(tencentVm.state), false,
      `The virtual machine is in an ${tencentVm.state} state and cannot be restart.`)

    assert.strictEqual(IntermediatePhases.includes(tencentVm.phase), false,
      `The virtual machine is in an ${tencentVm.phase} state and cannot be restart.`)

    // 检查 phase 是否为 Started
    assert.strictEqual(tencentVm.phase, Phase.Started, 'The virtual machine is not started and cannot be restart.')

    await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').updateOne(
      { _id: tencentVm._id },
      {
        $set: {
          state: State.Restarting,
          phase: Phase.Started,
          updateTime: new Date()
        }
      })
  }

  static async delete(tencentVm: TencentCloudVirtualMachine): Promise<void> {
    // 检查状态是否为中间态
    assert.strictEqual(IntermediateStates.includes(tencentVm.state), false,
      `The virtual machine is in an ${tencentVm.state} state and cannot be deleted.`)

    assert.strictEqual(IntermediatePhases.includes(tencentVm.phase), false,
      `The virtual machine is in an ${tencentVm.phase} state and cannot be deleted.`)

    // 检查 phase 是否为 Stopped
    assert.strictEqual(tencentVm.phase, Phase.Stopped, 'The virtual machine is not stopped and cannot be deleted.')

    await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').updateOne(
      { _id: tencentVm._id },
      {
        $set: {
          state: State.Deleted,
          phase: Phase.Deleting,
          updateTime: new Date()
        }
      })
  }



  static async change(params: any): Promise<void> {
    // 变更套餐需要在关机状态下进行

    // 扩容磁盘需要在开机状态下进行
    throw new Error("Method not implemented.")
  }
}