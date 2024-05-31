
import { DescribeAccountQuotaResponse, Instance, InstanceTypeConfig, InstanceTypeQuotaItem, RunInstancesRequest } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import * as tencentcloud from "tencentcloud-sdk-nodejs"
import { ChargeType } from "@/entity"
import { StoppedMode } from "@/type"

// 导入对应产品模块的client models。
const CvmClient = tencentcloud.cvm.v20170312.Client

// 实例化要请求产品(以cvm为例)的client对象
const client = new CvmClient({
    // 为了保护密钥安全，建议将密钥设置在环境变量中或者配置文件中，请参考本文凭证管理章节。
    // 硬编码密钥到代码中有可能随代码泄露而暴露，有安全隐患，并不推荐。
    credential: {
        secretId: process.env.TENCENTCLOUD_SECRET_ID,
        secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
    },
    // 产品地域
    region: "ap-guangzhou",
    // 可选配置实例
    profile: {
        signMethod: "TC3-HMAC-SHA256", // 签名方法
        httpProfile: {
            reqMethod: "POST", // 请求方法
            reqTimeout: 30, // 请求超时时间，默认60s
            // proxy: "http://127.0.0.1:8899" // http请求代理
        },
    },
})

export class TencentVmOperation {
    private static client = client

    static async create(params: RunInstancesRequest): Promise<string> {
        const res = await client.RunInstances(params)
        const instanceId = res.InstanceIdSet[0]
        return instanceId
    }

    static async start(id: string): Promise<void> {
        const params = {
            "InstanceIds": [
                id,
            ]
        }
        await TencentVmOperation.client.StartInstances(params)
    }

    static async stop(id: string, stoppedMode?: StoppedMode): Promise<void> {
        const params = {
            "InstanceIds": [
                id,
            ],
            "StopType": "SOFT_FIRST",
            "StoppedMode": "STOP_CHARGING"
        }

        if (stoppedMode && stoppedMode === StoppedMode.KEEP_CHARGING) {
            params.StoppedMode = "KEEP_CHARGING"
        }

        await TencentVmOperation.client.StopInstances(params)
    }

    static async restart(id: string): Promise<void> {
        const params = {
            "InstanceIds": [
                id,
            ]
        }
        await TencentVmOperation.client.RebootInstances(params)
    }

    static async delete(id: string): Promise<void> {
        const params = {
            "InstanceIds": [
                id,
            ],
            // 释放包年包月 磁盘
            "ReleasePrepaidDataDisks": true
        }
        await TencentVmOperation.client.TerminateInstances(params)
    }

    static async change(params) {
        console.log('TencentVmOperation change', params)
    }

    static async getVmDetails(id: string): Promise<Instance> {
        const params = {
            "InstanceIds": [
                id,
            ]
        }
        const res = await TencentVmOperation.client.DescribeInstances(params)
        const instance: Instance = res.InstanceSet[0]
        return instance
    }

    static async getVmDetailsByInstanceName(instanceName: string): Promise<Instance> {
        const params = {
            "Filters": [
                {
                    "Name": "instance-name",
                    "Values": [
                        instanceName
                    ]
                }
            ]
        }
        const res = await TencentVmOperation.client.DescribeInstances(params)
        const instance: Instance = res.InstanceSet[0]
        return instance
    }

    static async getVmDetailsListByInstanceName(instanceName: string): Promise<Instance[]> {
        const params = {
            "Filters": [
                {
                    "Name": "instance-name",
                    "Values": [
                        instanceName
                    ]
                }
            ]
        }
        const res = await TencentVmOperation.client.DescribeInstances(params)
        const instanceList: Instance[] = res.InstanceSet
        return instanceList
    }

    static async vmStatus(id: string): Promise<string> {
        const params = {
            "InstanceIds": [
                id,
            ]
        }
        const res = await TencentVmOperation.client.DescribeInstancesStatus(params)
        const state = res.InstanceStatusSet[0].InstanceState
        return state
    }

    static async getInstanceTypeDetailList(): Promise<InstanceTypeConfig[]> {
        const params = {
            Filters: [
                {
                    Name: "zone",
                    Values: ["ap-guangzhou-6"],
                },
                {
                    Name: "instance-family",
                    Values: ["TS5"],
                },
            ],
        }
        const res = await TencentVmOperation.client.DescribeInstanceTypeConfigs(
            params,
        )

        const InstanceTypeList = res.InstanceTypeConfigSet

        return InstanceTypeList
    }
    static async getInstanceTypeDetails(instanceType: string): Promise<InstanceTypeConfig> {
        const params = {
            Filters: [
                {
                    Name: "zone",
                    Values: ["ap-guangzhou-6"],
                },
                {
                    Name: "instance-family",
                    Values: ["TS5"],
                },
                {
                    Name: "instance-type",
                    Values: [instanceType],
                }
            ],
        }
        const res = await TencentVmOperation.client.DescribeInstanceTypeConfigs(params)
        return res.InstanceTypeConfigSet[0]
    }
    static async describeZoneInstanceConfigInfo(zone: string, instanceFamily: string, instanceType: string, chargeType: ChargeType): Promise<InstanceTypeQuotaItem> {
        let instanceChargeType: string

        if (chargeType === ChargeType.PrePaid) {
            instanceChargeType = "PREPAID"
        }

        if (chargeType === ChargeType.PostPaidByHour) {
            instanceChargeType = 'POSTPAID_BY_HOUR'
        }

        if (!instanceChargeType) throw new Error('no instanceChargeType value')

        const params = {
            "Filters": [
                {
                    "Name": "zone",
                    "Values": [
                        zone
                    ]
                },
                {
                    "Name": "instance-family",
                    "Values": [
                        instanceFamily
                    ]
                },
                {
                    "Name": "instance-type",
                    "Values": [
                        instanceType
                    ]
                },
                {
                    "Name": "instance-charge-type",
                    "Values": [
                        instanceChargeType
                    ]
                }
            ]
        }
        const res = await TencentVmOperation.client.DescribeZoneInstanceConfigInfos(params)
        return res.InstanceTypeQuotaSet[0]
    }

    static async describeZoneInstanceConfigInfos(zone: string, instanceFamily: string, chargeType: ChargeType): Promise<InstanceTypeQuotaItem[]> {
        let instanceChargeType

        if (chargeType === ChargeType.PrePaid) {
            instanceChargeType = "PREPAID"
        }

        if (chargeType === ChargeType.PostPaidByHour) {
            instanceChargeType = 'POSTPAID_BY_HOUR'
        }

        if (!instanceChargeType) throw new Error('no instanceChargeType value')

        const params = {
            "Filters": [
                {
                    "Name": "zone",
                    "Values": [
                        zone
                    ]
                },
                {
                    "Name": "instance-family",
                    "Values": [
                        instanceFamily
                    ]
                },
                {
                    "Name": "instance-charge-type",
                    "Values": [
                        instanceChargeType
                    ]
                }
            ]
        }
        const res = await TencentVmOperation.client.DescribeZoneInstanceConfigInfos(params)
        return res.InstanceTypeQuotaSet
    }

    static async describeAccountQuota(chargeType?: ChargeType) {
        const params = {
            "Filters": [
                {
                    "Name": "zone",
                    "Values": [
                        "ap-guangzhou-6"
                    ]
                },
                {
                    "Name": "quota-type",
                    "Values": [
                        "PostPaidQuotaSet" // PostPaidQuotaSet,DisasterRecoverGroupQuotaSet,PrePaidQuotaSet,SpotPaidQuotaSet
                    ]
                }

            ]
        }
        if (chargeType && chargeType === ChargeType.PrePaid) {
            params.Filters[1].Values[0] = 'PrePaidQuotaSet'
        }

        const res: DescribeAccountQuotaResponse =
            await TencentVmOperation.client.DescribeAccountQuota(params)

        return res

    }

}