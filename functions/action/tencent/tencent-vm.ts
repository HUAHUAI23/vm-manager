import { db } from '../../db'
import { State, CloudVirtualMachine, Phase, TencentCloudVirtualMachine } from "../../entity"

export class TencentVm {
  static async create(vm: TencentCloudVirtualMachine): Promise<void> {
    await db.collection<CloudVirtualMachine>('CloudVirtualMachine').insertOne(vm)
  }

  // Todo findOneAndUpdate 设计思路文档补充
  static async start(tencentVm: TencentCloudVirtualMachine): Promise<boolean> {

    const res = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: tencentVm._id,
        state: State.Stopped,
        phase: Phase.Stopped
      },
      {
        $set: {
          state: State.Running,
          phase: Phase.Starting,
          updateTime: new Date()
        }
      }
    )

    if (!res.value) {
      return false
    }

    return true


  }

  static async stop(tencentVm: TencentCloudVirtualMachine): Promise<boolean> {
    const res = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: tencentVm._id,
        state: State.Running,
        phase: Phase.Started
      },
      {
        $set: {
          state: State.Stopped,
          phase: Phase.Stopping,
          updateTime: new Date()
        }
      }
    )

    if (!res.value) {
      return false
    }

    return true

  }

  static async restart(tencentVm: TencentCloudVirtualMachine): Promise<boolean> {
    const res = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: tencentVm._id,
        state: State.Running,
        phase: Phase.Started
      },
      {
        $set: {
          state: State.Restarting,
          phase: Phase.Started,
          updateTime: new Date()
        }
      }
    )

    if (!res.value) {
      return false
    }

    return true
  }

  static async delete(tencentVm: TencentCloudVirtualMachine): Promise<boolean> {
    const res = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOneAndUpdate(
      {
        _id: tencentVm._id,
        state: State.Stopped,
        phase: Phase.Stopped
      },
      {
        $set: {
          state: State.Deleted,
          phase: Phase.Deleting,
          updateTime: new Date()
        }
      }
    )

    if (!res.value) {
      return false
    }

    return true

  }



  static async change(params: any): Promise<void> {
    // 变更套餐需要在关机状态下进行

    // 扩容磁盘需要在开机状态下进行
    throw new Error("Method not implemented.")
  }
}