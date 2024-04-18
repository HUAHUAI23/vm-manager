import { VmVendors, getVmVendor } from '../type'
import { Phase, Region, State, TencentCloudVirtualMachine, VirtualMachinePackageList } from '../entity'
import { verifyBearerToken } from '../utils'
import { TencentVmOperation } from '../sdk/tencent/tencent-sdk'
import { TencentVm } from './tencent/tencent-vm'
import { db } from '../db'

interface IRequestBody {
    virtualMachinePackageName: string
    virtualMachinePackageType: string
    imageId: string
    systemDisk: number
    dataDisks: number[]
    internetMaxBandwidthOut: number
    loginName?: string
    loginPassword: string
    metaData?: {
        [key: string]: any
    }
}

export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.authorization)
    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }

    const body: IRequestBody = ctx.request.body

    const region = await db.collection<Region>('Region').findOne({ sealosRegionUid: ok.sealosRegionUid })

    const virtualMachinePackage = await db.collection<VirtualMachinePackageList>('VirtualMachinePackageList').findOne({
        sealosRegionUid: region.sealosRegionUid,
        cloudProvider: region.cloudProvider,
        cloudProviderZone: 'ap-guangzhou-6',
        virtualMachinePackageName: body.virtualMachinePackageName,
        virtualMachinePackageFamily: body.virtualMachinePackageType
    })

    if (!virtualMachinePackage) {
        return { data: null, error: 'virtualMachinePackage not found' }
    }

    const nanoid = await import('nanoid')

    const vendorType: VmVendors = getVmVendor(region.cloudProvider)
    switch (vendorType) {
        case VmVendors.Tencent:
            const gen = nanoid.customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 7)
            const instanceName = gen()

            const find = await db.collection<TencentCloudVirtualMachine>('CloudVirtualMachine').findOne({ instanceName: instanceName })

            if (find) {
                throw new Error(`The virtual machine with the instanceName ${instanceName} already exists.`)
            }


            const instanceConfigInfo = await
                TencentVmOperation.describeZoneInstanceConfigInfo(virtualMachinePackage.cloudProviderVirtualMachinePackageName)

            if (instanceConfigInfo.Status !== 'SELL') {
                return { data: null, error: 'sold out' }
            }

            const diskSize = body.systemDisk + body.dataDisks.reduce((acc, curr) => acc + curr, 0)


            const tencentCloudVirtualMachine: TencentCloudVirtualMachine = {
                phase: Phase.Creating,
                state: State.Running,
                namespace: ok.namespace,
                sealosUserId: ok.sealosUserId,
                cpu: instanceConfigInfo.Cpu,
                memory: instanceConfigInfo.Memory,
                gpu: instanceConfigInfo.Gpu,
                disk: diskSize,
                publicNetworkAccess: body.internetMaxBandwidthOut > 0,
                internetMaxBandwidthOut: body.internetMaxBandwidthOut,
                imageId: body.imageId,
                instanceName: instanceName,
                loginPassword: body.loginPassword,
                cloudProvider: VmVendors.Tencent,
                createTime: new Date(),
                updateTime: new Date(),
                metaData: {
                    "SecurityGroupIds": [
                        "sg-jvxnr55b"
                    ],
                    InstanceChargeType: 'POSTPAID_BY_HOUR',
                    Placement: {
                        Zone: 'ap-guangzhou-6',
                        ProjectId: 1311479,
                    },
                    InstanceType: virtualMachinePackage.cloudProviderVirtualMachinePackageName,
                    ImageId: body.imageId,
                    SystemDisk: {
                        DiskType: "CLOUD_BSSD",
                        DiskSize: body.systemDisk
                    },
                    VirtualPrivateCloud: {
                        VpcId: 'vpc-oin9dr9h',
                        SubnetId: 'subnet-643z86ds'
                    },
                    InternetAccessible: {
                        InternetChargeType: "BANDWIDTH_POSTPAID_BY_HOUR",
                        InternetMaxBandwidthOut: body.internetMaxBandwidthOut > 0 ? body.internetMaxBandwidthOut : 0,
                        PublicIpAssigned: body.internetMaxBandwidthOut > 0
                    },
                    InstanceName: instanceName,
                    LoginSettings: {
                        Password: body.loginPassword
                    },
                    TagSpecification: [
                        {
                            ResourceType: "instance",
                            Tags: [
                                {
                                    Key: "sealos-user",
                                    Value: ok.sealosUserId
                                }
                            ]
                        }

                    ],
                    UserData: 'IyEvYmluL2Jhc2gKc2V0IC1ldXhvIHBpcGVmYWlsCmlmIFtbICRFVUlEIC1uZSAwIF1dOyB0aGVuCiAgIGVjaG8gIlRoaXMgc2NyaXB0IG11c3QgYmUgcnVuIGFzIHJvb3QiIAogICBleGl0IDEKZmkKUkVTT0xWRV9ESVI9L2V0Yy9zeXN0ZW1kL3Jlc29sdmVkLmNvbmYuZApSRVNPTFZFX0ZJTEU9c2VhbG9zLWNvcmVkbnMuY29uZgplY2hvICJTZXR0aW5nIHVwIEROUyBzZXJ2ZXIuLi4iCm1rZGlyIC1wICR7UkVTT0xWRV9ESVJ9CmVjaG8gIltSZXNvbHZlXSIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkROUz0xMC45Ni4wLjEwIiA+PiAke1JFU09MVkVfRElSfS8ke1JFU09MVkVfRklMRX0KZWNobyAiRG9tYWlucz1+LiIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkZhbGxiYWNrRE5TPTE4My42MC44My4xOSIgPj4gJHtSRVNPTFZFX0ZJTEV9CnN5c3RlbWN0bCByZXN0YXJ0IHN5c3RlbWQtcmVzb2x2ZWQKZWNobyAiRE5TIHNlcnZlciBzZXR1cCBjb21wbGV0ZS4i'
                }

            }

            if (body.dataDisks[0]) {

                tencentCloudVirtualMachine.metaData.DataDisks = body.dataDisks.map((size) => ({
                    DiskType: "CLOUD_BSSD",
                    DiskSize: size,
                    DeleteWithInstance: true,
                }))
            }

            await TencentVm.create(tencentCloudVirtualMachine)

            return { data: tencentCloudVirtualMachine.instanceName, error: null }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }

}
