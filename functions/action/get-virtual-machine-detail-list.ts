import { verifyBearerToken } from '../utils'
import { VmVendors, getVmVendor } from '../type'
import { db } from '../db'
import { TencentCloudVirtualMachine } from '../entity'
interface IRequestBody {
    cloudProvider: string
    page: number
    pageSize: number
}

export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.token)
    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }
    const body: IRequestBody = ctx.request.body
    const vendorType: VmVendors = getVmVendor(body.cloudProvider)
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