import cloud from '@lafjs/cloud'

export default async function (ctx: FunctionContext) {
  console.info('Hello World')
  return { data: 'hi, laf' }
}
