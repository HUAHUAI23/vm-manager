
import { ObjectId } from 'mongodb'
import { VmVendors } from './type'
import { RunInstancesRequest } from 'tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models'

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
  PrePaid = 'prePaid'
}

export class CloudVirtualMachine<T = { [key: string]: any }> {
  _id?: ObjectId
  // name?: string
  // description: string
  phase: Phase
  state: State

  // TODO 后续去除 namespace sealosUserId
  // sealosNamespace: string
  sealosNamespace: string
  sealosUserId: string
  sealosUserUid: string
  sealosRegionUid: string
  sealosRegionDomain: string


  zoneName: string
  zoneId: ObjectId
  region: string

  cpu: number
  memory: number
  gpu?: number
  disk: number
  publicNetworkAccess: boolean
  internetMaxBandwidthOut?: number

  privateIpAddresses?: string[]
  publicIpAddresses?: string[]

  instanceName: string
  // cloudInstanceId: string
  instanceId?: string
  imageId: string

  loginPort?: number
  loginName?: string
  loginPassword: string

  cloudProvider: VmVendors
  cloudProviderZone: string

  virtualMachinePackageFamilyId: ObjectId
  virtualMachinePackageName: string
  changeType?: ChangeType
  chargeType: ChargeType

  // 创建时间
  createTime: Date
  // 状态变更时，该时间会发生变化
  updateTime: Date
  // 状态变更时，锁时间，限制多实例下并发同时操作一个 VM
  lockedAt: Date
  // 按量计费 上锁时间，限制多实例下并发同时操作一个 VM
  billingLockedAt: Date
  // 最近一次 按量计费时间
  latestBillingTime: Date
  // 欠费于
  oweAt?: Date
  metaData: T
}

export interface TencentMeta extends RunInstancesRequest { }

// 重新声明 metaData 类型
// 为兼容有些代码存在的 const vm:TencentCloudVirtualMachine 写法，新代码应用 const vm:CloudVirtualMachine<TencentMeta> 写法
export class TencentCloudVirtualMachine extends CloudVirtualMachine {
  declare metaData: TencentMeta
}

export class Region {
  _id?: ObjectId
  name: string
  sealosRegionUid: string
  sealosRegionDomain: string
  // sealos k8s 所在云服务商
  cloudProvider: VmVendors
  // sealos k8s 所在云服务商的可用区
  cloudProviderZone: string[]
}
export class CloudVirtualMachineZone {
  _id?: ObjectId
  regionId: ObjectId
  cloudProviderZone: string
  name: string
}

export enum Arch {
  X86_64 = 'x86_64',
  AArch64 = 'aarch64',
  Heterogeneous = 'heterogeneous', // 异构计算
  BareMetal = 'bareMetal', // 裸金属云服务器
}

export enum VirtualMachineType {
  General = 'general',
  GPU = 'gpu',
  NPU = 'npu',
  HighPerformance = 'highPerformance',
  HighIO = 'highIO',
  HighMemory = 'highMemory',
  CostEffective = 'costEffective'
}

export class VirtualMachinePackageFamily {
  _id?: ObjectId
  // 云厂商每一个 zone 有不同的套餐类型
  cloudVirtualMachineZoneId: ObjectId
  cloudProviderVirtualMachinePackageFamily: string
  virtualMachinePackageFamily: string
  virtualMachineType: VirtualMachineType
  virtualMachineArch: Arch
  chargeType: ChargeType
}

export class BandwidthPricingTier {
  minBandwidth: number // 最小带宽，单位Mbps
  maxBandwidth: number // 最大带宽，单位Mbps
  pricePerMbps: number // 每Mbps的价格，单位：元/Mbps/月
}

export class DiscountInfo {
  durationInMonths: number
  discountRate: number // 折扣率，如0.6表示6折
}

// 价格，按量 是每小时的价格，包年包月是每月的价格
export class VirtualMachinePackage {
  _id?: ObjectId
  virtualMachinePackageFamilyId: ObjectId
  virtualMachinePackageName: string
  cloudProviderVirtualMachinePackageName: string
  instancePrice: number
  diskPerG: number
  bandwidthPricingTiers: BandwidthPricingTier[]
  chargeType: ChargeType
  discountInfo?: DiscountInfo[]
}

export enum CloudVirtualMachineBillingState {
  Pending = 'Pending',
  Done = 'Done',
}

export enum RenewalPlan {
  Manual = 'Manual',
  Auto = 'Auto'
}

export enum SubscriptionState {
  Done = 'Done',
  Pending = 'Pending',
}
export class CloudVirtualMachineSubscription {
  _id?: ObjectId
  sealosUserId: string
  sealosUserUid: string
  sealosRegionUid: string
  sealosRegionDomain: string
  sealosNamespace: string
  region: string
  zoneId: ObjectId
  zoneName: string
  instanceName: string

  virtualMachinePackageFamilyId: ObjectId
  virtualMachinePackageName: string
  cloudProviderVirtualMachinePackageFamily: string
  cloudProviderVirtualMachinePackageName: string
  cloudProviderZone: string
  cloudProvider: VmVendors
  detail: {
    instance: number
    network: number
    disk: number
  }
  renewalPlan: RenewalPlan
  state: SubscriptionState
  createTime: Date
  updateTime: Date
  expireTime: Date
  subscriptionDuration: number
}

export class CloudVirtualMachineBilling {
  id?: ObjectId
  sealosUserId: string
  sealosUserUid: string
  sealosRegionUid: string
  sealosRegionDomain: string
  sealosNamespace: string
  // 后续去除 namespace
  namespace: string
  instanceName: string
  region: string
  zoneId: ObjectId
  zoneName: string

  virtualMachinePackageFamilyId: ObjectId
  virtualMachinePackageName: string
  cloudProviderVirtualMachinePackageFamily: string
  cloudProviderVirtualMachinePackageName: string
  cloudProviderZone: string
  cloudProvider: VmVendors
  detail: {
    instance: number
    network: number
    disk: number
  }
  startAt: Date
  endAt: Date
  amount: number
  state: CloudVirtualMachineBillingState
  chargeType: ChargeType
  subscriptionId?: ObjectId
  uuid?: string
}

export class ErrorLogs {
  _id?: ObjectId
  error: string
  createTime: Date
  errorMessage: string
  errorDetails: string
  errorLevel: 'Warning' | 'Error' | 'Fatal'
  // TODO  后续去除 sealosUserId
  sealosUserId: string
  sealosUserUid: string
  instanceName: string
  serviceName: string
}


// 左闭右开
// export function getPriceForBandwidth(
//   vmPackage: VirtualMachinePackage,
//   bandwidth: number
// ): number | null {
//   for (const tier of vmPackage.bandwidthPricingTiers) {
//     // 修改条件为左闭右开：[minBandwidth, maxBandwidth)
//     if (bandwidth >= tier.minBandwidth && (tier.maxBandwidth === null || bandwidth < tier.maxBandwidth)) {
//       return tier.pricePerMbps
//     }
//   }
//   return null // 没有找到匹配的带宽区间，返回 null
// }

// 左开右闭
export function getPriceForBandwidth(
  vmPackage: VirtualMachinePackage,
  bandwidth: number
): number | null {
  if (bandwidth === 0) return 0

  for (const tier of vmPackage.bandwidthPricingTiers) {
    // 修改条件为左开右闭：(minBandwidth, maxBandwidth]
    if (bandwidth > tier.minBandwidth && (tier.maxBandwidth === null || bandwidth <= tier.maxBandwidth)) {
      return tier.pricePerMbps
    }
  }
  return null // 没有找到匹配的带宽区间，返回 null
}
