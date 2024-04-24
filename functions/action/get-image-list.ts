import { verifyBearerToken } from '../utils'
import { VmVendors, getVmVendor } from '../type'
import { Region } from '../entity'
import { db } from '../db'



// todo 返回数据处理
export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.authorization)

    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }

    const region = await db.collection<Region>('Region').findOne({ sealosRegionUid: ok.sealosRegionUid })

    if (!region) {
        return { data: null, error: 'Region not found' }
    }

    const vendorType: VmVendors = getVmVendor(region.cloudProvider)
    switch (vendorType) {
        case VmVendors.Tencent:
            const imgeList = {
                ubuntu: {
                    images: [
                        {
                            id: 'img-487zeit5',
                            os: 'ubuntu',
                            version: '22.04-LTS',
                            architect: 'x86_64',
                        },
                    ],
                    url: 'https://objectstorageapi.hzh.sealos.run/u2jbon3l-system-image/Ubuntu.svg',
                },
                debian: {
                    images: [
                        {
                            id: 'img-o6psa5bt',
                            os: 'debian',
                            version: '12.4',
                            architect: 'x86_64',
                        },
                    ],
                    url: 'https://objectstorageapi.hzh.sealos.run/u2jbon3l-system-image/Debian.svg',
                },
            }
            return { data: imgeList, error: null }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }

}