import cloud from '@lafjs/cloud'
import { deductSealosBalance } from './utils'

export default async function (ctx: FunctionContext) {
  console.log('Hello World')
  const sealosUserUid = ''
  const testded = BigInt(1)
  deductSealosBalance(sealosUserUid, testded)
  return { data: 'hi, laf' }
}
