import { VmVendors, getVmVendor } from '../type'
import { validateDTO, verifyBearerToken } from '../utils'
import { ChargeType, IntermediatePhases, IntermediateStates, Phase, Region, TencentCloudVirtualMachine } from '../entity'
import { db } from '../db'
import { TencentVm } from './tencent/tencent-vm'


interface IRequestBody {
    instanceName: string
}

const iRequestBodySchema = {
    instanceName: value => typeof value === 'string'
}

export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.authorization)

    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }

    const region = await db.collection<Region>('Region').findOne({ sealosRegionUid: ok.sealosRegionUid })

    if (!region) {
        return { data: null, error: 'Region not found' }
    }

    const body: IRequestBody = ctx.request.body

    try {
        validateDTO(body, iRequestBodySchema)
    } catch (error) {
        return { data: null, error: error.message }
    }

    const vendorType: VmVendors = getVmVendor(region.cloudProvider)

    switch (vendorType) {
        case VmVendors.Tencent:
            const tencentVm: TencentCloudVirtualMachine =
                await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine')
                    .findOne({
                        instanceName: body.instanceName,
                        sealosUserUid: ok.sealosUserUid,
                        sealosRegionUid: ok.sealosRegionUid
                    })

            if (!tencentVm) {
                return { data: null, error: 'Virtual Machine not found' }
            }

            if (tencentVm.chargeType === ChargeType.PrePaid) {
                return { data: null, error: 'Prepaid virtual machine does not support this action.' }
            }

            // 检查状态是否为中间态
            if (IntermediateStates.includes(tencentVm.state)) {
                return { data: null, error: `The virtual machine is in an ${tencentVm.state} state and cannot be deleted.` }
            }

            if (IntermediatePhases.includes(tencentVm.phase)) {
                return { data: null, error: `The virtual machine is in an ${tencentVm.phase} state and cannot be deleted.` }
            }

            // 检查 phase 是否为 Stopped
            if (tencentVm.phase !== Phase.Stopped) {
                return { data: null, error: 'The virtual machine is not stopped and cannot be deleted.' }
            }


            const success = await TencentVm.delete(tencentVm)

            // 可能由于其他服务 删除了虚拟机，导致删除失败，例如 欠费被删
            if (!success) {
                throw new Error("Virtual state changed from Stopped to Deleted, document not found")
            }

            return { data: tencentVm.instanceName, error: null }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }
}