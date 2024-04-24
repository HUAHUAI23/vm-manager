
import { ObjectId } from 'mongodb'
import { VmVendors } from './type'
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
export enum ChargeType {
  PostPaidByHour = 'postPaidByHour',
}

export class CloudVirtualMachine {
  _id?: ObjectId
  phase: Phase
  state: State
  namespace: string
  sealosUserId: string
  sealosUserUid: string

  cpu: number
  memory: number
  gpu?: number
  disk: number
  publicNetworkAccess: boolean
  internetMaxBandwidthOut?: number

  privateIpAddresses?: string[]
  publicIpAddresses?: string[]

  instanceId?: string
  imageId: string
  instanceName: string
  loginName?: string
  loginPassword: string
  loginPort?: number

  cloudProvider: VmVendors
  cloudProviderZone: string
  sealosRegionUid: string
  sealosRegionDomain: string
  region: string
  virtualMachinePackageFamily: string
  virtualMachinePackageName: string
  changeType?: ChangeType
  chargeType: ChargeType
  // 创建时间
  createTime: Date
  // 状态变更时，该时间会发生变化
  updateTime: Date
  lockedAt: Date
  billingLockedAt: Date
  latestBillingTime: Date
  oweAt?: Date
  metaData: {
    [key: string]: any
  }
}

export interface TencentMeta {
  SecurityGroupIds: Array<string>
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

export class Region {
  _id?: ObjectId
  name: string
  sealosRegionUid: string
  sealosRegionDomain: string
  // sealos 所在云服务商
  cloudProvider: VmVendors
  // sealos k8s 所在云服务商的可用区
  cloudProviderZone: string[]
}
export class CloudVirtualMachineZone {
  _id?: ObjectId
  regionId: ObjectId
  cloudProviderZone: string
}
export class VirtualMachinePackageFamily {
  _id?: ObjectId
  // 云厂商每一个 zone 有不同的套餐类型
  cloudVirtualMachineZoneId: ObjectId
  cloudProviderVirtualMachinePackageFamily: string
  virtualMachinePackageFamily: string
}

export class VirtualMachinePackage {
  _id?: ObjectId
  virtualMachinePackageFamilyId: ObjectId
  virtualMachinePackageName: string
  cloudProviderVirtualMachinePackageName: string
  instancePrice: number
  diskPerG: number
  networkSpeedBoundary: number
  networkSpeedUnderSpeedBoundaryPerHour: number
  networkSpeedAboveSpeedBoundaryPerHour: number
  chargeType: ChargeType
}

export enum CloudVirtualMachineBillingState {
  Pending = 'Pending',
  Done = 'Done',
}

export class CloudVirtualMachineBilling {
  _id?: ObjectId
  instanceName: string
  namespace: string
  startAt: Date
  endAt: Date
  virtualMachinePackageFamily: string
  virtualMachinePackageName: string
  cloudProviderVirtualMachinePackageFamily: string
  cloudProviderVirtualMachinePackageName: string
  cloudProviderZone: string
  cloudProvider: VmVendors
  region: string
  sealosUserId: string
  sealosUserUid: string
  sealosRegionUid: string
  sealosRegionDomain: string
  amount: number
  detail: {
    instance: number
    network: number
    disk: number
  }
  state: CloudVirtualMachineBillingState
}
