
import { ObjectId } from 'mongodb'
import { VMTypes } from './type'
import { DataDisk, SystemDisk } from 'tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models'

export enum Phase {
  Creating = 'Creating',
  Created = 'Created',
  Starting = 'Starting',
  Started = 'Started',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Deleting = 'Deleting',
  Deleted = 'Deleted',
}

export enum State {
  Running = 'Running',
  Stopped = 'Stopped',
  Restarting = 'Restarting',
  Deleted = 'Deleted',
  Changing = 'Changing'
}

export const IntermediateStates: State[] = [
  State.Changing,
  State.Restarting
]

export const IntermediatePhases: Phase[] = [
  Phase.Creating,
  Phase.Starting,
  Phase.Stopping,
  Phase.Deleting
]

export enum ChangeType {
  ChangePassword = 'ChangePassword',
  ChangeNetwork = 'ChangeNetwork',
  ChangeInstanceType = 'ChangeInstanceType',
  ChangeDisk = 'ChangeDisk'
}

export class CloudVirtualMachine {
  _id?: ObjectId
  phase: Phase
  state: State
  namespace: string
  sealosUserId: string

  cpu: number
  disk: number
  memory: number
  publicNetworkAccess: boolean
  internetMaxBandwidthOut?: number

  privateIpAddresses?: string[]
  publicIpAddresses?: string[]

  instanceId?: string
  imageId: string
  instanceName: string
  loginName: string
  loginPassword: string
  loginPort?: number
  cloudProvider: VMTypes
  changeType?: ChangeType
  metaData: {
    [key: string]: any
  }
}

export interface TencentMeta {
  InstanceChargeType: string
  Placement: {
    Zone: string
    ProjectId: number
  }
  InstanceType: string
  ImageId: string
  SystemDisk: SystemDisk
  DataDisks?: Array<DataDisk>
  VirtualPrivateCloud: {
    VpcId: string
    SubnetId: string
  }
  InternetAccessible?: {
    InternetChargeType: string
    InternetMaxBandwidthOut: number
    PublicIpAssigned: boolean
  }
  InstanceName: string
  LoginSettings?: {
    Password: string
  }
  TagSpecification: Array<{
    ResourceType: string
    Tags: Array<{
      Key: string
      Value: string
    }>
  }>
  UserData: string
}


export class TencentCloudVirtualMachine extends CloudVirtualMachine {
  declare metaData: TencentMeta
}

const test = {
  'InstanceType': 'S2.SMALL1',
  "ImageId": "img-487zeit5",
  "SystemDisk": {
    "DiskSize": 30
  },
  "DataDisks": [
    {
      "DiskSize": 30,
    }
  ],
  "InternetAccessible": {
    "InternetChargeType": "BANDWIDTH_POSTPAID_BY_HOUR",
    "InternetMaxBandwidthOut": 1,
  },
  "LoginSettings": {
    "Password": "Testhuahua."
  },
  "cloudProvider": "tencent"
}
