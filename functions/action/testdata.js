const params = {
    "InstanceChargeType": "PREPAID", // -
    "InstanceChargePrepaid": {
        "Period": 1,
        "RenewFlag": "NOTIFY_AND_MANUAL_RENEW" //- DISABLE_NOTIFY_AND_MANUAL_RENEW
    },

    "Placement": {
        "Zone": "ap-guangzhou-6",
        "ProjectId": 1311479
    },
    "InstanceType": "TS5.MEDIUM4",
    "ImageId": "img-487zeit5",
    "SystemDisk": {
        "DiskType": "CLOUD_BSSD",
        "DiskSize": 20
    },
    "DataDisks": [
        {
            "DiskType": "CLOUD_BSSD",
            "DiskSize": 20,
            "DeleteWithInstance": true
        }
    ],
    "VirtualPrivateCloud": {
        "VpcId": "vpc-oin9dr9h",
        "SubnetId": "subnet-643z86ds"
    },
    "InternetAccessible": {
        "InternetChargeType": "BANDWIDTH_PREPAID", // -
        "InternetMaxBandwidthOut": 5,
        "PublicIpAssigned": true
    },
    "InstanceCount": 1,
    "InstanceName": "test",
    "LoginSettings": {
        "Password": "123RwwssssRw3"
    },
    "SecurityGroupIds": [
        "sg-jvxnr55b"
    ],
    "EnhancedService": {
        "SecurityService": {
            "Enabled": true
        },
        "MonitorService": {
            "Enabled": true
        },
        "AutomationService": {
            "Enabled": true
        }
    },
    "ClientToken": "system-f3827db9-c58a-49cc-bf10-33fc1923a34a",
    "TagSpecification": [
        {
            "ResourceType": "instance",
            "Tags": [
                {
                    "Key": "sealos-user",
                    "Value": "test"
                }
            ]
        }
    ],
    "UserData": "IyEvYmluL2Jhc2gKc2V0IC1ldXhvIHBpcGVmYWlsCmlmIFtbICRFVUlEIC1uZSAwIF1dOyB0aGVuCiAgIGVjaG8gIlRoaXMgc2NyaXB0IG11c3QgYmUgcnVuIGFzIHJvb3QiIAogICBleGl0IDEKZmkKUkVTT0xWRV9ESVI9L2V0Yy9zeXN0ZW1kL3Jlc29sdmVkLmNvbmYuZApSRVNPTFZFX0ZJTEU9c2VhbG9zLWNvcmVkbnMuY29uZgplY2hvICJTZXR0aW5nIHVwIEROUyBzZXJ2ZXIuLi4iCm1rZGlyIC1wICR7UkVTT0xWRV9ESVJ9CmVjaG8gIltSZXNvbHZlXSIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkROUz0xMC45Ni4wLjEwIiA+PiAke1JFU09MVkVfRElSfS8ke1JFU09MVkVfRklMRX0KZWNobyAiRG9tYWlucz1+LiIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkZhbGxiYWNrRE5TPTE4My42MC44My4xOSIgPj4gJHtSRVNPTFZFX0ZJTEV9CnN5c3RlbWN0bCByZXN0YXJ0IHN5c3RlbWQtcmVzb2x2ZWQKZWNobyAiRE5TIHNlcnZlciBzZXR1cCBjb21wbGV0ZS4i",
    "DryRun": true,
    "DisableApiTermination": false
}


const params1 = {
    "InstanceChargeType": "POSTPAID_BY_HOUR",
    "Placement": {
        "Zone": "ap-guangzhou-6",
        "ProjectId": 1311479
    },
    "InstanceType": "TS5.MEDIUM4",
    "ImageId": "img-487zeit5",
    "SystemDisk": {
        "DiskType": "CLOUD_BSSD",
        "DiskSize": 20
    },
    "DataDisks": [
        {
            "DiskType": "CLOUD_BSSD",
            "DiskSize": 20,
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
    "InstanceCount": 1,
    "InstanceName": "test",
    "LoginSettings": {
        "Password": "123RREEdttttR*"
    },
    "SecurityGroupIds": [
        "sg-jvxnr55b"
    ],
    "EnhancedService": {
        "SecurityService": {
            "Enabled": true
        },
        "MonitorService": {
            "Enabled": true
        },
        "AutomationService": {
            "Enabled": true
        }
    },
    "ClientToken": "system-f3827db9-c58a-49cc-bf10-33fc1923a34a",
    "TagSpecification": [
        {
            "ResourceType": "instance",
            "Tags": [
                {
                    "Key": "sealos-user",
                    "Value": "test"
                }
            ]
        }
    ],
    "UserData": "IyEvYmluL2Jhc2gKc2V0IC1ldXhvIHBpcGVmYWlsCmlmIFtbICRFVUlEIC1uZSAwIF1dOyB0aGVuCiAgIGVjaG8gIlRoaXMgc2NyaXB0IG11c3QgYmUgcnVuIGFzIHJvb3QiIAogICBleGl0IDEKZmkKUkVTT0xWRV9ESVI9L2V0Yy9zeXN0ZW1kL3Jlc29sdmVkLmNvbmYuZApSRVNPTFZFX0ZJTEU9c2VhbG9zLWNvcmVkbnMuY29uZgplY2hvICJTZXR0aW5nIHVwIEROUyBzZXJ2ZXIuLi4iCm1rZGlyIC1wICR7UkVTT0xWRV9ESVJ9CmVjaG8gIltSZXNvbHZlXSIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkROUz0xMC45Ni4wLjEwIiA+PiAke1JFU09MVkVfRElSfS8ke1JFU09MVkVfRklMRX0KZWNobyAiRG9tYWlucz1+LiIgPj4gJHtSRVNPTFZFX0RJUn0vJHtSRVNPTFZFX0ZJTEV9CmVjaG8gIkZhbGxiYWNrRE5TPTE4My42MC44My4xOSIgPj4gJHtSRVNPTFZFX0ZJTEV9CnN5c3RlbWN0bCByZXN0YXJ0IHN5c3RlbWQtcmVzb2x2ZWQKZWNobyAiRE5TIHNlcnZlciBzZXR1cCBjb21wbGV0ZS4i"
}


// {
//     "Response": {
//         "Error": {
//             "Code": "InvalidParameterValue.VpcNotSupportIpv6Address",
//                 "Message": "The `9829944` does not support ipv6."
//         },
//         "RequestId": "b5cc8944-6699-4a22-b6be-7e9e1c4cd07e"
//     }
// }