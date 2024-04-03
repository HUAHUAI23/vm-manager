import { createCloudVm } from './vm-factory'
import { VMTypes, getVmType } from '../type'
import { Phase, State, TencentCloudVirtualMachine } from '../entity'

export default async function (ctx: FunctionContext) {
    // const { vmType } = ctx.request.query
    const test = {
        'instanceType': 'S2.SMALL1',
        "imageId": "img-487zeit5",
        "SystemDisk": {
            "DiskSize": 30
        },
        "DataDisks": [
            {
                "DiskSize": 30,
            }
        ],
        "InternetMaxBandwidthOut": 1,
        "LoginSettings": {
            "Password": "Testhuahua."
        },
        "cloudProvider": "tencent"
    }
    const tencentVm: TencentCloudVirtualMachine = {
        state: State.Running,
        phase: Phase.Creating,
        namespace: 'default',
        sealosUserId: "testhuahua",
        cpu: 1,
        disk: 1,
        memory: 1,
        publicNetworkAccess: true,
        imageId: 'img-487zeit5',
        instanceName: "testhuahua",
        loginName: "ubuntu",
        loginPassword: 'Testhuahua.',
        cloudProvider: VMTypes.Tencent,
        metaData: {
            "instanceChargeType": "POSTPAID_BY_HOUR",
            "placement": {
                "zone": "ap-guangzhou-6",
                "projectId": 1311479
            },
            "instanceType": "TS5.MEDIUM4",
            "imageId": "img-487zeit5",
            "systemDisk": {
                "diskType": "CLOUD_BSSD",
                "diskSize": 30
            },
            "dataDisks": [
                {
                    "diskType": "CLOUD_BSSD",
                    "diskSize": 30,
                    "deleteWithInstance": true
                }
            ],
            "virtualPrivateCloud": {
                "vpcId": "vpc-oin9dr9h",
                "subnetId": "subnet-643z86ds"
            },
            "internetAccessible": {
                "internetChargeType": "BANDWIDTH_POSTPAID_BY_HOUR",
                "internetMaxBandwidthOut": 1,
                "publicIpAssigned": true
            },
            "instanceName": "test-huahua",
            "loginSettings": {
                "password": "Testhuahua."
            },
            "tagSpecification": [
                {
                    "resourceType": "instance",
                    "tags": [
                        {
                            "key": "sealos-user",
                            "value": "testhuahua"
                        }
                    ]
                }
            ],
            "userData": "IyEvYmluL2Jhc2gKc2V0IC1ldXhvIHBpcGVmYWlsCmlmIFtbICRFVUlEIC1uZSAwIF1dOyB0aGVuCiAgIGVjaG8gIlRoaXMgc2NyaXB0IG11c3QgYmUgcnVuIGFzIHJvb3QiIAogICBleGl0IDEKZmkKUkVTT0xWRV9ESVI9L2V0Yy9zeXN0ZW1kL3Jlc29sdmVkLmNvbmYuZApSRVNPTFZFX0ZJTEU9c2VhbG9zLWNvcmVkbnMuY29uZgplY2hvICJTZXR0aW5nIHVwIEROUyBzZXJ2ZXIuLi4iCm1rZGlyIC1wICR7UkVTT0xWRV9ESVJ9CmVjaG8gIltSZXNvbHZlXSIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkROUz0xMC45Ni4wLjEwIiA+PiAke1JFU09MVkVfRElSfS8ke1JFU09MVkVfRklMRX0KZWNobyAiRG9tYWlucz1+LiIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkZhbGxiYWNrRE5TPTE4My42MC44My4xOSIgPj4gJHtSRVNPTFZFX0ZJTEV9CnN5c3RlbWN0bCByZXN0YXJ0IHN5c3RlbWQtcmVzb2x2ZWQKZWNobyAiRE5TIHNlcnZlciBzZXR1cCBjb21wbGV0ZS4i"
        }
    }

    const vmType = getVmType('tencent')
    const cloudVm = createCloudVm(vmType)
    try {
        await cloudVm.create(ctx.request.body)
    } catch (error) {
        console.error(error)
    }
    console.log('Hello World')
    return { data: 'hi, laf' }
}