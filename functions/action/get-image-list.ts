import { VmVendors, getVmVendor } from '../type'


interface IRequestBody {
    instanceName: string
    cloudProvider: string
}



export default async function (ctx: FunctionContext) {
    const body: IRequestBody = ctx.request.body
    const vendorType: VmVendors = getVmVendor(body.cloudProvider)
    switch (vendorType) {
        case VmVendors.Tencent:
            const imgeList = {
                ubuntu: [
                    {
                        id: 'img-487zeit5', os: 'ubuntu', version: '22.04-LTS', architect: 'x86_64', img: ''
                    }

                ],
                centos: [
                    {
                        id: 'img-l8og963d', os: 'centos', version: '7.9', architect: 'x86_64'
                    }
                ],
                debian: [
                    {
                        id: 'img-o6psa5bt', os: 'debian', version: '12.4', architect: 'x86_64'
                    }
                ],
            }
            return { data: imgeList, error: null }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }

}
