import { validateDTO, verifyBearerToken } from '../utils'
import { db } from '../db'
const Decimal = require('decimal.js')
import { Arch, ChargeType, CloudVirtualMachineZone, Region, VirtualMachinePackage, VirtualMachinePackageFamily, VirtualMachineType, getPriceForBandwidth } from '../entity'

interface IRequestBody {
  virtualMachinePackageFamily: string
  virtualMachinePackageName: string

  virtualMachineType: VirtualMachineType
  virtualMachineArch: Arch
  chareType: ChargeType

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

const iRequestBodySchema = {
  virtualMachinePackageName: value => typeof value === 'string',
  virtualMachinePackageFamily: value => typeof value === 'string',
  imageId: value => typeof value === 'string',
  systemDisk: value => typeof value === 'number' && Number.isInteger(value),
  dataDisks: value => Array.isArray(value) && value.every(item => typeof item === 'number' && Number.isInteger(item)),
  internetMaxBandwidthOut: value => typeof value === 'number',
  loginName: value => typeof value === 'string' || value === undefined,
  loginPassword: value => typeof value === 'string',
  zone: value => typeof value === 'string',
  metaData: value => typeof value === 'object' && value !== null || value === undefined,
  virtualMachineType: () => true,
  virtualMachineArch: () => true,
  chareType: () => true
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

  const chargeType = ChargeType.PostPaidByHour
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

  // 计算实例价格
  const instancePrice = new Decimal(virtualMachinePackage.instancePrice)

  // 计算硬盘价格
  const diskPrice = diskSize.mul(new Decimal(virtualMachinePackage.diskPerG))
  let networkPrice = new Decimal(0)

  const networkPricePerMbps = getPriceForBandwidth(virtualMachinePackage, body.internetMaxBandwidthOut)
  // 根据带宽计算网络价格
  networkPrice =
    new Decimal(networkPricePerMbps)
      .mul(new Decimal(body.internetMaxBandwidthOut))

  // 将 Decimal 对象转换为数字类型
  price.diskPrice = diskPrice.toNumber()
  price.instancePrice = instancePrice.toNumber()
  price.networkPrice = networkPrice.toNumber()



  return { data: price, error: null }
}
