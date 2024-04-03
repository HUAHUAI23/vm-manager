
import { Instance, InstanceTypeConfig } from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models"
import { IVmOperation } from "../vm-operation-service"
import * as tencentcloud from "tencentcloud-sdk-nodejs"

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

export class TencentVmOperation implements IVmOperation {
    private static client = client

    async create(params): Promise<string> {
        const res = await client.RunInstances(params)
        const instanceId = res.InstanceIdSet[0]
        return instanceId
    }

    async start(id: string): Promise<void> {
        const params = {
            "InstanceIds": [
                id,
            ]
        }
        await TencentVmOperation.client.StartInstances(params)
    }

    async stop(params) {
        console.log('TencentVmOperation stop', params)
    }
    async restart(params) {
        console.log('TencentVmOperation restart', params)
    }

    async delete(id: string): Promise<void> {
        const params = {
            "InstanceIds": [
                id,
            ],
            // 释放包年包月
            "ReleasePrepaidDataDisks": true
        }
        await TencentVmOperation.client.TerminateInstances(params)
    }

    async change(params) {
        console.log('TencentVmOperation change', params)
    }
    async getVmDetails(id: string): Promise<Instance> {
        const params = {
            "InstanceIds": [
                id,
            ]
        }
        const res = await TencentVmOperation.client.DescribeInstances(params)
        const instance: Instance = res.InstanceSet[0]
        return instance
    }

    async vmStatus(id: string): Promise<string> {
        const params = {
            "InstanceIds": [
                id,
            ]
        }
        const res = await TencentVmOperation.client.DescribeInstancesStatus(params)
        const state = res.InstanceStatusSet[0].InstanceState
        return state
    }

    async getInstanceTypeList(): Promise<InstanceTypeConfig[]> {
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

}