import { VmVendors, getVmVendor } from '../type'
import { Arch, ChargeType, CloudVirtualMachineZone, Phase, Region, State, TencentCloudVirtualMachine, VirtualMachinePackage, VirtualMachinePackageFamily, VirtualMachineType } from '../entity'
import { getSealosUserAccount, validateDTO, verifyBearerToken } from '../utils'
import { TencentVmOperation } from '../sdk/tencent/tencent-sdk'
import { TencentVm } from './tencent/tencent-vm'
import { db } from '../db'
import CONSTANTS from '../constants'
import { getCloudVirtualMachineOneHourFee } from '../billing-task'
interface IRequestBody {
    virtualMachinePackageFamily: string
    virtualMachinePackageName: string

    virtualMachineType: VirtualMachineType
    virtualMachineArch: Arch
    chareType: ChargeType

    imageId: string
    systemDisk: number
    dataDisks: number[]
    internetMaxBandwidthOut: number
    loginName?: string
    loginPassword: string
    zone: string
    metaData?: {
        [key: string]: any
    }
}

const iRequestBodySchema = {
    virtualMachinePackageName: value => typeof value === 'string',
    virtualMachinePackageFamily: value => typeof value === 'string',
    imageId: value => typeof value === 'string',
    systemDisk: value => typeof value === 'number' && Number.isInteger(value),
    dataDisks: value => Array.isArray(value) && value.every(item => typeof item === 'number' && Number.isInteger(item)),
    internetMaxBandwidthOut: value => typeof value === 'number',
    loginName: value => typeof value === 'string' || value === undefined,
    loginPassword: value => typeof value === 'string',
    zone: value => typeof value === 'string',
    metaData: value => typeof value === 'object' && value !== null || value === undefined,
    virtualMachineType: () => true,
    virtualMachineArch: () => true,
    chareType: () => true
}



export default async function (ctx: FunctionContext) {
    const ok = verifyBearerToken(ctx.headers.authorization)
    if (!ok) {
        return { data: null, error: 'Unauthorized' }
    }

    const body: IRequestBody = ctx.request.body

    try {
        validateDTO(body, iRequestBodySchema)
    } catch (error) {
        return { data: null, error: error.message }
    }

    const region = await db.collection<Region>('Region').findOne({ sealosRegionUid: ok.sealosRegionUid })

    if (!region) {
        return { data: null, error: 'Region not found' }
    }


    const cloudVirtualMachineZone = await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone')
        .findOne({ regionId: region._id, name: body.zone })

    if (!cloudVirtualMachineZone) {
        return { data: null, error: 'CloudVirtualMachineZone not found' }
    }

    // const chargeType = ChargeType.PostPaidByHour
    const chargeType = body.chareType
    const virtualMachinePackageFamily = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily')
        .findOne({
            cloudVirtualMachineZoneId: cloudVirtualMachineZone._id,
            virtualMachinePackageFamily: body.virtualMachinePackageFamily,
            virtualMachineType: body.virtualMachineType,
            virtualMachineArch: body.virtualMachineArch,
            chargeType: chargeType

        })

    if (!virtualMachinePackageFamily) {
        return { data: null, error: 'virtualMachinePackageFamily not found' }
    }

    const virtualMachinePackage = await db.collection<VirtualMachinePackage>('VirtualMachinePackage')
        .findOne({
            virtualMachinePackageName: body.virtualMachinePackageName,
            virtualMachinePackageFamilyId: virtualMachinePackageFamily._id,
            chargeType: chargeType
        })

    if (!virtualMachinePackage) {
        return { data: null, error: 'virtualMachinePackage not found' }
    }

    const diskSize = body.systemDisk + (body.dataDisks ? body.dataDisks.reduce((acc, curr) => acc + curr, 0) : 0)

    const cloudVirtualMachineOneHourFee = getCloudVirtualMachineOneHourFee(
        virtualMachinePackage,
        body.internetMaxBandwidthOut ? body.internetMaxBandwidthOut : 0,
        diskSize
    )

    const sealosAccountRMB = await getSealosUserAccount(ok.sealosUserUid)

    if (sealosAccountRMB < cloudVirtualMachineOneHourFee) {
        return { data: null, error: 'Insufficient balance' }
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
                TencentVmOperation.describeZoneInstanceConfigInfo(cloudVirtualMachineZone.cloudProviderZone,
                    virtualMachinePackageFamily.cloudProviderVirtualMachinePackageFamily,
                    virtualMachinePackage.cloudProviderVirtualMachinePackageName,
                    chargeType)

            if (instanceConfigInfo.Status !== 'SELL') {
                return { data: null, error: 'sold out' }
            }


            const tencentCloudVirtualMachine: TencentCloudVirtualMachine = {
                phase: Phase.Creating,
                state: State.Running,
                sealosNamespace: ok.sealosNamespace,
                sealosUserId: ok.sealosUserId,
                sealosUserUid: ok.sealosUserUid,
                sealosRegionUid: region.sealosRegionUid,
                sealosRegionDomain: region.sealosRegionDomain,

                zoneId: cloudVirtualMachineZone._id,
                zoneName: cloudVirtualMachineZone.name,
                region: region.name,

                cpu: instanceConfigInfo.Cpu,
                memory: instanceConfigInfo.Memory,
                gpu: instanceConfigInfo.Gpu,
                disk: diskSize,

                publicNetworkAccess: body.internetMaxBandwidthOut > 0,
                internetMaxBandwidthOut: body.internetMaxBandwidthOut > 0 ? body.internetMaxBandwidthOut : 0,

                instanceName: instanceName,
                imageId: body.imageId,

                loginPassword: body.loginPassword,

                cloudProvider: VmVendors.Tencent,
                cloudProviderZone: cloudVirtualMachineZone.cloudProviderZone,

                virtualMachinePackageFamilyId: virtualMachinePackageFamily._id,
                virtualMachinePackageName: virtualMachinePackage.virtualMachinePackageName,

                chargeType: virtualMachinePackage.chargeType,

                createTime: new Date(),
                updateTime: new Date(),
                lockedAt: CONSTANTS.TASK_LOCK_INIT_TIME,
                billingLockedAt: CONSTANTS.TASK_LOCK_INIT_TIME,
                latestBillingTime: CONSTANTS.TASK_LOCK_INIT_TIME,

                metaData: {
                    InstanceChargeType: chargeType === ChargeType.PostPaidByHour ? 'POSTPAID_BY_HOUR' : "PREPAID",
                    Placement: {
                        Zone: cloudVirtualMachineZone.cloudProviderZone,
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
                        InternetChargeType: chargeType === ChargeType.PostPaidByHour ? "BANDWIDTH_POSTPAID_BY_HOUR" : "BANDWIDTH_PREPAID",
                        InternetMaxBandwidthOut: body.internetMaxBandwidthOut > 0 ? body.internetMaxBandwidthOut : 0,
                        PublicIpAssigned: body.internetMaxBandwidthOut > 0
                    },
                    InstanceCount: 1,
                    InstanceName: instanceName,
                    LoginSettings: {
                        Password: body.loginPassword
                    },
                    SecurityGroupIds: [
                        "sg-jvxnr55b"
                    ],
                    EnhancedService: {
                        SecurityService: {
                            Enabled: true
                        },
                        MonitorService: {
                            Enabled: true
                        },
                        AutomationService: {
                            Enabled: true
                        }
                    },
                    ClientToken: "system-f3827db9-c58a-49cc-bf10-33fc1923a34a",
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

            if (body?.dataDisks[0]) {

                tencentCloudVirtualMachine.metaData.DataDisks = body.dataDisks.map((size) => ({
                    DiskType: "CLOUD_BSSD",
                    DiskSize: size,
                    DeleteWithInstance: true,
                }))
            }

            if (chargeType === ChargeType.PrePaid) {

                tencentCloudVirtualMachine.metaData.InstanceChargePrepaid = {
                    Period: 1,
                    RenewFlag: "NOTIFY_AND_MANUAL_RENEW"
                }
            }

            await TencentVm.create(tencentCloudVirtualMachine)

            return { data: tencentCloudVirtualMachine.instanceName, error: null }

        default:
            throw new Error(`Unsupported Vendor type: ${vendorType}`)
    }

}
