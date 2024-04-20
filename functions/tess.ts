import cloud from '@lafjs/cloud'
import { pgPool } from './db'
export default async function (ctx: FunctionContext) {
  const sealosUserUid = '0074ee0a-03fa-4b57-9fe9-9356de0e56dd'
  const query = {
    text: 'SELECT * FROM "Account" WHERE "userUid" = $1',
    values: [sealosUserUid],  // 将userUid作为参数传递给查询
  }
  const res = await pgPool.query(query)
  // const res = await pgPool.query('SELECT * FROM "Account" LIMIT 1')
  console.log(res.rows)
  console.log('Hello World')
  return { data: 'hi, laf' }
}
