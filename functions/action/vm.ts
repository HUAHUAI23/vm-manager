import { CloudVirtualMachine } from "@/entity"

export interface IVM {
  create(params: CloudVirtualMachine): Promise<any>
  start(params: CloudVirtualMachine): Promise<any>
  stop(params: CloudVirtualMachine): Promise<any>
  restart(params: CloudVirtualMachine): Promise<any>
  delete(params: any): Promise<any>
  change(params: any): Promise<any>
}

export class CloudVm implements IVM {
  vm: IVM

  constructor(vm: IVM) {
    this.vm = vm
  }

  async create(params: CloudVirtualMachine): Promise<any> {
    await this.vm.create(params)
  }

  async start(params: CloudVirtualMachine): Promise<any> {
    await this.vm.start(params)
  }
  async stop(params: CloudVirtualMachine): Promise<any> {
    await this.vm.stop(params)
  }
  async restart(params: CloudVirtualMachine): Promise<any> {
    await this.vm.restart(params)
  }
  async delete(params: any): Promise<any> {
    await this.vm.delete(params)
  }

  async change(params: any): Promise<any> {
    await this.vm.change(params)
  }
}