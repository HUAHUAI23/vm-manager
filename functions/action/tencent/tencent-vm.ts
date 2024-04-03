import { IVM } from "../vm"
import { db } from '../../db'
import { IntermediatePhases, IntermediateStates, State, CloudVirtualMachine, Phase, TencentCloudVirtualMachine } from "../../entity"

export class TencentVm implements IVM {
  async create(vm: TencentCloudVirtualMachine): Promise<void> {
    db.collection<CloudVirtualMachine>('CloudVirtualMachine').insertOne(vm)
  }

  async start(params: any): Promise<void> {
    throw new Error("Method not implemented.")
  }
  async stop(params: any): Promise<void> {
    throw new Error("Method not implemented.")
  }
  async restart(params: any): Promise<void> {
    throw new Error("Method not implemented.")
  }
  async delete(vm: CloudVirtualMachine): Promise<void> {
    // 检查状态是否为中间态
    if (IntermediateStates.includes(vm.state)) {
      throw new Error(`The virtual machine is in an ${vm.state} state and cannot be deleted.`)
    }

    if (IntermediatePhases.includes(vm.phase)) {
      throw new Error(`The virtual machine is in an ${vm.phase} state and cannot be deleted.`)
    }

    // 检查 phase 是否为 Stopped
    if (vm.phase !== Phase.Stopped) {
      throw new Error('The virtual machine is not stopped and cannot be deleted.')
    }

    db.collection<CloudVirtualMachine>('CloudVirtual').updateOne(
      { id: vm._id },
      {
        $set: {
          status: State.Deleted
        }
      })
  }



  async change(params: any): Promise<void> {
    throw new Error("Method not implemented.")
  }
}