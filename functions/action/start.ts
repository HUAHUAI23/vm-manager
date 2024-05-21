import { VmVendors, getVmVendor } from '../type'
import { getSealosUserAccount, validateDTO, verifyBearerToken } from '../utils'
import {  CloudVirtualMachineZone, IntermediatePhases, IntermediateStates, Phase, Region, TencentCloudVirtualMachine, VirtualMachinePackage, VirtualMachinePackageFamily } from '../entity'
import { db } from '../db'
import { TencentVm } from './tencent/tencent-vm'
import { getCloudVirtualMachineOneHourFee } from '../billing-task'

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
                        sealosRegionUid: ok.sealosRegionUid
                    })

            if (!tencentVm) {
                return { data: null, error: 'Virtual Machine not found' }
            }

            const cloudVirtualMachineZone = await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone')
                .findOne({ regionId: region._id, _id: tencentVm.zoneId })

            if (!cloudVirtualMachineZone) {
                return { data: null, error: 'CloudVirtualMachineZone not found' }
            }

            const virtualMachinePackageFamily = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily')
                .findOne({
                    cloudVirtualMachineZoneId: tencentVm.zoneId,
                    _id: tencentVm.virtualMachinePackageFamilyId
                })

            if (!virtualMachinePackageFamily) {
                return { data: null, error: 'virtualMachinePackageFamily not found' }
            }

            const virtualMachinePackage = await db.collection<VirtualMachinePackage>('VirtualMachinePackage')
                .findOne({
                    virtualMachinePackageName: tencentVm.virtualMachinePackageName,
                    virtualMachinePackageFamilyId: virtualMachinePackageFamily._id,
                    chargeType: tencentVm.chargeType 
                })


            const cloudVirtualMachineOneHourFee = getCloudVirtualMachineOneHourFee(
                virtualMachinePackage,
                tencentVm.internetMaxBandwidthOut ? tencentVm.internetMaxBandwidthOut : 0,
                tencentVm.disk
            )
            const sealosAccountRMB = await getSealosUserAccount(ok.sealosUserUid)

            if (sealosAccountRMB < cloudVirtualMachineOneHourFee) {
                return { data: null, error: 'Insufficient balance' }
            }


            // 检查状态是否为中间态
            if (IntermediateStates.includes(tencentVm.state)) {
                return { data: null, error: `The virtual machine is in an ${tencentVm.state} state and cannot be start.` }
            }

            if (IntermediatePhases.includes(tencentVm.phase)) {
                return { data: null, error: `The virtual machine is in an ${tencentVm.phase} state and cannot be start.` }
            }

            // 检查 phase 是否为 Stopped
            if (tencentVm.phase !== Phase.Stopped) {
                return { data: null, error: 'The virtual machine is not stopped and cannot be start.' }
            }


            const success = await TencentVm.start(tencentVm)

            if (!success) {
                throw new Error("Virtual state changed from Stopped to Running, document not found")
            }

            return { data: tencentVm.instanceName, error: null }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }
}