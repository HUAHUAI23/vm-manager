import { VmVendors, getVmVendor } from '../type'
import { verifyBearerToken } from '../utils'
import { IntermediatePhases, IntermediateStates, Phase, Region, TencentCloudVirtualMachine } from '../entity'
import { db } from '../db'
import { TencentVm } from './tencent/tencent-vm'

interface IRequestBody {
    instanceName: string
}

export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.authorization)

    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }

    const region = await db.collection<Region>('Region').findOne({ sealosRegionUid: ok.sealosRegionUid })
    const body: IRequestBody = ctx.request.body
    const vendorType: VmVendors = getVmVendor(region.cloudProvider)

    switch (vendorType) {
        case VmVendors.Tencent:
            const tencentVm: TencentCloudVirtualMachine =
                await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine')
                    .findOne({
                        instanceName: body.instanceName,
                        sealosUserId: ok.sealosUserId,
                        namespace: ok.namespace
                    })

            if (!tencentVm) {
                return { data: null, error: 'Virtual Machine not found' }
            }

            if (IntermediateStates.includes(tencentVm.state)) {
                return { data: null, error: `The virtual machine is in an ${tencentVm.state} state and cannot be restart.` }
            }

            if (IntermediatePhases.includes(tencentVm.phase)) {
                return { data: null, error: `The virtual machine is in an ${tencentVm.phase} state and cannot be restart.` }
            }

            if (tencentVm.phase !== Phase.Started) {
                return { data: null, error: 'The virtual machine is not started and cannot be restart.' }
            }

            await TencentVm.restart(tencentVm)

            return { data: tencentVm.instanceName, error: null }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }
}