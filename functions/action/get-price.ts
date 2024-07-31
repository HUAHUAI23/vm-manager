import { Schema, validateDTO, validatePeriod, verifyBearerToken } from '../utils'
import { db } from '../db'
const Decimal = require('decimal.js')
import { Arch, ChargeType, CloudVirtualMachineZone, Region, VirtualMachinePackage, VirtualMachinePackageFamily, VirtualMachineType, getPriceForBandwidth } from '../entity'
import { isValueInEnum } from '@/type'

interface IRequestBody {
  virtualMachineArch: Arch
  virtualMachineType: VirtualMachineType

  virtualMachinePackageFamily: string
  virtualMachinePackageName: string

  chargeType: ChargeType
  period?: number
  counts?: number

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

interface IResponse {
  instancePrice: number
  networkPrice: number
  diskPrice: number
}

const iRequestBodySchema: Schema = {
  virtualMachineArch: (value) => Object.values(Arch).includes(value),
  virtualMachineType: (value) => Object.values(VirtualMachineType).includes(value),
  virtualMachinePackageFamily: (value) => typeof value === 'string',
  virtualMachinePackageName: (value) => typeof value === 'string',
  chargeType: (value) => Object.values(ChargeType).includes(value),
  period: { optional: true, validate: (value) => typeof value === 'number' },
  counts: { optional: true, validate: (value) => Number.isInteger(value) && value !== 0 },
  imageId: (value) => typeof value === 'string',
  systemDisk: (value) => typeof value === 'number',
  dataDisks: (value) => Array.isArray(value) && value.every(v => typeof v === 'number'),
  internetMaxBandwidthOut: (value) => typeof value === 'number',
  loginName: { optional: true, validate: (value) => typeof value === 'string' },
  loginPassword: (value) => typeof value === 'string',
  zone: (value) => typeof value === 'string',
  metaData: { optional: true, validate: (value) => typeof value === 'object' && value !== null && !Array.isArray(value) },
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

  let chargeType: ChargeType

  try {
    chargeType = isValueInEnum(ChargeType, body.chargeType)
  } catch (error) {
    return { data: null, error: 'chargeType not found' }
  }

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

  const price: IResponse = {
    instancePrice: 0,
    diskPrice: 0,
    networkPrice: 0
  }

  const diskSize = new Decimal(body.systemDisk || 0).plus(
    body.dataDisks ? body.dataDisks.reduce((acc, curr) => acc.plus(curr), new Decimal(0)) : 0
  )

  const period = body.period ?? 1

  try {
    validatePeriod(period)
  } catch (error) {
    return { data: null, error: error.message }
  }

  // 计算实例价格

  // 折扣计算
  // let discountRate = 1
  // if (chargeType === ChargeType.PrePaid && virtualMachinePackage.discountInfo) {
  //   const discount = virtualMachinePackage.discountInfo.find(d => d.durationInMonths === period)
  //   if (discount) {
  //     discountRate = discount.discountRate
  //   }
  // }

  const counts = body.counts && body.counts > 1 ? body.counts : 1

  const instancePrice = new Decimal(virtualMachinePackage.instancePrice).
    mul(new Decimal(period)).mul(counts)

  // 计算硬盘价格
  const diskPrice = diskSize.mul(new Decimal(virtualMachinePackage.diskPerG))
    .mul(new Decimal(period)).mul(counts)


  const networkPricePerMbps = getPriceForBandwidth(virtualMachinePackage, body.internetMaxBandwidthOut)

  if (networkPricePerMbps === null) {
    return { data: null, error: 'networkPricePerMbps not found' }
  }

  // 根据带宽计算网络价格
  const networkPrice =
    new Decimal(networkPricePerMbps)
      .mul(new Decimal(body.internetMaxBandwidthOut))
      .mul(new Decimal(period)).mul(counts)

  // 将 Decimal 对象转换为数字类型
  price.diskPrice = diskPrice.toNumber()
  price.instancePrice = instancePrice.toNumber()
  price.networkPrice = networkPrice.toNumber()



  return { data: price, error: null }
}
