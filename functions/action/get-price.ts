import { validateDTO, verifyBearerToken } from '../utils'
import { db } from '../db'
const Decimal = require('decimal.js')
import { ChargeType, CloudVirtualMachineZone, Region, VirtualMachinePackage, VirtualMachinePackageFamily } from '../entity'

interface IRequestBody {
  virtualMachinePackageName: string
  virtualMachinePackageFamily: string
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

interface IResponse {
  instancePrice: number
  networkPrice: number
  diskPrice: number
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
  metaData: value => typeof value === 'object' && value !== null || value === undefined
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

  const zone = 'ap-guangzhou-6'
  const cloudVirtualMachineZone = await db.collection<CloudVirtualMachineZone>('CloudVirtualMachineZone')
    .findOne({ regionId: region._id, cloudProviderZone: zone })

  if (!cloudVirtualMachineZone) {
    return { data: null, error: 'CloudVirtualMachineZone not found' }
  }

  const virtualMachinePackageFamily = await db.collection<VirtualMachinePackageFamily>('VirtualMachinePackageFamily')
    .findOne({
      cloudVirtualMachineZoneId: cloudVirtualMachineZone._id,
      virtualMachinePackageFamily: body.virtualMachinePackageFamily
    })

  if (!virtualMachinePackageFamily) {
    return { data: null, error: 'virtualMachinePackageFamily not found' }
  }

  const virtualMachinePackage = await db.collection<VirtualMachinePackage>('VirtualMachinePackage')
    .findOne({
      virtualMachinePackageName: body.virtualMachinePackageName,
      virtualMachinePackageFamilyId: virtualMachinePackageFamily._id,
      chargeType: ChargeType.PostPaidByHour
    })

  if (!virtualMachinePackage) {
    return { data: null, error: 'virtualMachinePackage not found' }
  }

  const price: IResponse = {
    instancePrice: 0,
    diskPrice: 0,
    networkPrice: 0
  }

  const diskSize = new Decimal(body.systemDisk || 0).plus(
    body.dataDisks ? body.dataDisks.reduce((acc, curr) => acc.plus(curr), new Decimal(0)) : 0
  )

  // 计算实例价格
  const instancePrice = new Decimal(virtualMachinePackage.instancePrice)

  // 计算硬盘价格
  const diskPrice = diskSize.mul(new Decimal(virtualMachinePackage.diskPerG))
  let networkPrice = new Decimal(0)

  // 根据带宽计算网络价格
  if (body.internetMaxBandwidthOut) {
    const internetMaxBandwidthOut = new Decimal(body.internetMaxBandwidthOut)
    const networkSpeedBoundary = new Decimal(virtualMachinePackage.networkSpeedBoundary)
    if (internetMaxBandwidthOut.lessThan(networkSpeedBoundary)) {
      networkPrice = internetMaxBandwidthOut.mul(new Decimal(virtualMachinePackage.networkSpeedUnderSpeedBoundaryPerHour))
    } else {
      networkPrice = internetMaxBandwidthOut.mul(new Decimal(virtualMachinePackage.networkSpeedAboveSpeedBoundaryPerHour))
    }
  }

  // 将 Decimal 对象转换为数字类型
  price.diskPrice = diskPrice.toNumber()
  price.instancePrice = instancePrice.toNumber()
  price.networkPrice = networkPrice.toNumber()



  return { data: price, error: null }
}
