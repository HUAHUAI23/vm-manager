import { VmVendors, getVmVendor } from '../type'
import { validateDTO, verifyBearerToken } from '../utils'
import { IntermediatePhases, IntermediateStates, Phase, Region, TencentCloudVirtualMachine } from '../entity'
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
                        sealosUserId: ok.sealosUserId,
                        sealosNamespace: ok.namespace
                    })

            if (!tencentVm) {
                return { data: null, error: 'Virtual Machine not found' }
            }
            // 检查状态是否为中间态
            if (IntermediateStates.includes(tencentVm.state)) {
                return { data: null, error: `The virtual machine is in an ${tencentVm.state} state and cannot be stop.` }
            }

            if (IntermediatePhases.includes(tencentVm.phase)) {
                return { data: null, error: `The virtual machine is in an ${tencentVm.phase} state and cannot be stop.` }
            }
            // 检查 phase 是否为 Started
            if (tencentVm.phase !== Phase.Started) {
                return { data: null, error: 'The virtual machine is not started and cannot be stop.' }
            }

            const success = await TencentVm.stop(tencentVm)

            if (!success) {
                return { data: null, error: 'Account in arrears, unable to perform VM change operations' }
            }

            return { data: tencentVm.instanceName, error: null }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }
}