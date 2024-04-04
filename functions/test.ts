import cloud from "@lafjs/cloud"
// 导入对应产品模块的client models。
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

async function create() {
  const params = {
    "InstanceChargeType": "POSTPAID_BY_HOUR",
    "Placement": {
      "Zone": "ap-guangzhou-6",
      "ProjectId": 1311479
    },
    "InstanceType": "TS5.MEDIUM4",
    "ImageId": "img-487zeit5",
    "SystemDisk": {
      "DiskType": "CLOUD_BSSD",
      "DiskSize": 30
    },
    "DataDisks": [
      {
        "DiskType": "CLOUD_BSSD",
        "DiskSize": 30,
        "DeleteWithInstance": true
      }
    ],
    "VirtualPrivateCloud": {
      "VpcId": "vpc-oin9dr9h",
      "SubnetId": "subnet-643z86ds"
    },
    "InternetAccessible": {
      "InternetChargeType": "BANDWIDTH_POSTPAID_BY_HOUR",
      "InternetMaxBandwidthOut": 1,
      "PublicIpAssigned": true
    },
    "InstanceName": "test-huahua22",
    "LoginSettings": {
      "Password": "Testhuahua."
    },
    "TagSpecification": [
      {
        "ResourceType": "instance",
        "Tags": [
          {
            "Key": "sealos-user",
            "Value": "testhuahua"
          }
        ]
      }
    ],
    "UserData": "IyEvYmluL2Jhc2gKc2V0IC1ldXhvIHBpcGVmYWlsCmlmIFtbICRFVUlEIC1uZSAwIF1dOyB0aGVuCiAgIGVjaG8gIlRoaXMgc2NyaXB0IG11c3QgYmUgcnVuIGFzIHJvb3QiIAogICBleGl0IDEKZmkKUkVTT0xWRV9ESVI9L2V0Yy9zeXN0ZW1kL3Jlc29sdmVkLmNvbmYuZApSRVNPTFZFX0ZJTEU9c2VhbG9zLWNvcmVkbnMuY29uZgplY2hvICJTZXR0aW5nIHVwIEROUyBzZXJ2ZXIuLi4iCm1rZGlyIC1wICR7UkVTT0xWRV9ESVJ9CmVjaG8gIltSZXNvbHZlXSIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkROUz0xMC45Ni4wLjEwIiA+PiAke1JFU09MVkVfRElSfS8ke1JFU09MVkVfRklMRX0KZWNobyAiRG9tYWlucz1+LiIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkZhbGxiYWNrRE5TPTE4My42MC44My4xOSIgPj4gJHtSRVNPTFZFX0ZJTEV9CnN5c3RlbWN0bCByZXN0YXJ0IHN5c3RlbWQtcmVzb2x2ZWQKZWNobyAiRE5TIHNlcnZlciBzZXR1cCBjb21wbGV0ZS4i"
  }
  client.RunInstances(params).then(
    (data) => {
      console.log(JSON.stringify(data, null, 2))
    },
    (err) => {
      console.error("error", err)
    }
  )
}
async function InquiryPriceRunInstances(){
  const params = {
    "InstanceChargeType": "POSTPAID_BY_HOUR",
    "Placement": {
      "Zone": "ap-guangzhou-6",
      "ProjectId": 1311479
    },
    "InstanceType": "TS5.MEDIUM4",
    "ImageId": "img-487zeit5",
    "SystemDisk": {
      "DiskType": "CLOUD_BSSD",
      "DiskSize": 30
    },
    "DataDisks": [
      {
        "DiskType": "CLOUD_BSSD",
        "DiskSize": 30,
        "DeleteWithInstance": true
      }
    ],
    "VirtualPrivateCloud": {
      "VpcId": "vpc-oin9dr9h",
      "SubnetId": "subnet-643z86ds"
    },
    "InternetAccessible": {
      "InternetChargeType": "BANDWIDTH_POSTPAID_BY_HOUR",
      "InternetMaxBandwidthOut": 1,
      "PublicIpAssigned": true
    },
    "InstanceName": "test-huahua22",
    "LoginSettings": {
      "Password": "Testhuahua."
    },
    "TagSpecification": [
      {
        "ResourceType": "instance",
        "Tags": [
          {
            "Key": "sealos-user",
            "Value": "testhuahua"
          }
        ]
      }
    ],
    "UserData": "IyEvYmluL2Jhc2gKc2V0IC1ldXhvIHBpcGVmYWlsCmlmIFtbICRFVUlEIC1uZSAwIF1dOyB0aGVuCiAgIGVjaG8gIlRoaXMgc2NyaXB0IG11c3QgYmUgcnVuIGFzIHJvb3QiIAogICBleGl0IDEKZmkKUkVTT0xWRV9ESVI9L2V0Yy9zeXN0ZW1kL3Jlc29sdmVkLmNvbmYuZApSRVNPTFZFX0ZJTEU9c2VhbG9zLWNvcmVkbnMuY29uZgplY2hvICJTZXR0aW5nIHVwIEROUyBzZXJ2ZXIuLi4iCm1rZGlyIC1wICR7UkVTT0xWRV9ESVJ9CmVjaG8gIltSZXNvbHZlXSIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkROUz0xMC45Ni4wLjEwIiA+PiAke1JFU09MVkVfRElSfS8ke1JFU09MVkVfRklMRX0KZWNobyAiRG9tYWlucz1+LiIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkZhbGxiYWNrRE5TPTE4My42MC44My4xOSIgPj4gJHtSRVNPTFZFX0ZJTEV9CnN5c3RlbWN0bCByZXN0YXJ0IHN5c3RlbWQtcmVzb2x2ZWQKZWNobyAiRE5TIHNlcnZlciBzZXR1cCBjb21wbGV0ZS4i"
  }
  client.InquiryPriceRunInstances(params).then(
    (data) => {
      console.log(JSON.stringify(data,null,2));
    },
    (err) => {
      console.error("error", err);
    }
  );

}

async function describeZones() {
  client.DescribeZones(null, function (err, response) {
    // 请求异常返回，打印异常信息
    if (err) {
      console.log(err)
      return
    }
    // 请求正常返回，打印response对象
    console.log(response)
  })
}

async function describeInstanceTypeConfigs() {
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
  client.DescribeInstanceTypeConfigs(params).then(
    (data) => {
      console.log(data)
    },
    (err) => {
      console.error("error", err)
    }
  )
}

async function DescribeInstances() {
  const params = {
    "InstanceIds": [
      "ins-ber1xw16"
    ]
  }
  // StopChargingMode
  // InstanceType
  client.DescribeInstances(params).then(
    (data) => {
      console.log(JSON.stringify(data,null,2))
    },
    (err) => {
      console.error("error", err)
    }
  )
}

async function StartInstances() {
  const params = {
    "InstanceIds": [
      "ins-9okjzn6y"
    ]
  }
  client.StartInstances(params).then(
    (data) => {
      console.log(data)
    },
    (err) => {
      console.error("error", err)
    }
  )
}
async function RebootInstances() {
  const params = {
    "InstanceIds": [
      "ins-ber1xw16"
    ]
  }
  client.RebootInstances(params).then(
    (data) => {
      console.log(data)
    },
    (err) => {
      console.error("error", err)
    }
  )
}
async function StopInstances() {
  const params = {
    "InstanceIds": [
      "ins-59x5hyea"
    ],
    "StopType": "SOFT_FIRST",
    "StoppedMode": "STOP_CHARGING" //KEEP_CHARGING
  }
  client.StopInstances(params).then(
    (data) => {
      console.log(data)
    },
    (err) => {
      console.error("error", err)
    }
  )

}
async function DescribeInstancesStatus() {
  const params = {
    "InstanceIds": [
      "ins-3v7vzu1u"
    ]
  }
  client.DescribeInstancesStatus(params).then(
    (data) => {
      console.log(JSON.stringify(data,null,2))
    },
    (err) => {
      console.error("error", err)
    }
  )
}
async function ResetInstancesType() {
  // LatestOperationState SUCCESS
  const params = {
    "InstanceIds": [
      "ins-59x5hyea"
    ],
    "InstanceType": "TS5.MEDIUM4"
  }
  client.ResetInstancesType(params).then(
    (data) => {
      console.log(data)
    },
    (err) => {
      console.error("error", err)
    }
  )
}
async function ResizeInstanceDisks() {
  const params = {
    "InstanceId": "ins-6u74b9ym",
    // "DataDisks": [
    //   {
    //     "DeleteWithInstance": false
    //   }
    // ],
    // "ForceStop": false,
    "SystemDisk": {
      "DiskType": "CLOUD_SSD",
      "DiskId": "disk-ry214oby",
      "DiskSize": 100
    },
    "ResizeOnline": true
  }
  client.ResizeInstanceDisks(params).then(
    (data) => {
      console.log(JSON.stringify(data, null, 2))
    },
    (err) => {
      console.error("error", err)
    }
  )
}
async function ResetInstancesPassword() {
  const params = {
    "InstanceIds": [
      "ins-np669l9g"
    ],
    "Password": "12#45&errrrr",
    "UserName": "ubuntu"
  }
  client.ResetInstancesPassword(params).then(
    (data) => {
      console.log(data)
    },
    (err) => {
      console.error("error", err)
    }
  )
}

export default async function (ctx: FunctionContext) {
  console.log("Hello World")
  // await create()
  // await InquiryPriceRunInstances()
  // await StartInstances()
  // await DescribeInstancesStatus()
  // await RebootInstances()
  // await DescribeInstances()
  // await ResizeInstanceDisks()
  // await describeInstanceTypeConfigs()
  return { data: "hi, laf" }
}
