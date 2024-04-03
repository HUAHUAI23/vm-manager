import { TencentVmOperation } from "./tencent/tencent-sdk"

export interface IVmOperation {
  create(params: any): Promise<any>
  start(params: any): Promise<any>
  stop(params: any): Promise<any>
  restart(params: any): Promise<any>
  delete(params: any): Promise<any>
  change(params: any): Promise<any>
  getVmDetails(params: any): Promise<any>
  vmStatus(params: any): Promise<any>
}

export class CloudVmOperation implements IVmOperation {

  vmOperation: IVmOperation

  constructor(vmOperation: IVmOperation) {
    this.vmOperation = vmOperation
  }

  async create(params: any): Promise<any> {
    await this.vmOperation.create(params)
  }

  async start(params: any): Promise<any> {
    await this.vmOperation.create(params)
  }

  async stop(params: any): Promise<any> {
    await this.vmOperation.stop(params)
  }

  async restart(params: any): Promise<any> {
    await this.vmOperation.restart(params)
  }

  async delete(params: any): Promise<any> {
    await this.vmOperation.delete(params)
  }

  async change(params: any): Promise<any> {
    await this.vmOperation.change(params)
  }

  async getVmDetails(params: any): Promise<any> {
    await this.vmOperation.getVmDetails(params)
  }

  async vmStatus(params: any): Promise<any> {
    await this.vmOperation.vmStatus(params)
  }
}
