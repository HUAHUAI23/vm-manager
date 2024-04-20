import { validateDTO, verifyBearerToken } from '../utils'
import { VmVendors, getVmVendor } from '../type'
import { db } from '../db'
import { Region, TencentCloudVirtualMachine } from '../entity'
interface IRequestBody {
    page: number
    pageSize: number
}

const iRequestBodySchema = {
    page: value => typeof value === 'number' && value > 0 && Number.isInteger(value),
    pageSize: value => typeof value === 'number' && value > 0 && Number.isInteger(value)
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
            const total = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine')
                .countDocuments({
                    cloudProvider: vendorType,
                    sealosUserId: ok.sealosUserId,
                    namespace: ok.namespace
                })

            const tencentMachineList = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine')
                .find({
                    cloudProvider: vendorType,
                    sealosUserId: ok.sealosUserId,
                    namespace: ok.namespace
                }).skip(
                    (body.page - 1) * body.pageSize
                ).limit(body.pageSize)
                .toArray()


            const data = {
                list: tencentMachineList,
                total: total,
                page: body.page,
                pageSize: body.pageSize
            }

            return {
                data: data,
                error: null
            }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }
}