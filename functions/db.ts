import cloud from '@lafjs/cloud'
import pg from 'pg'
const { Pool, types } = pg
import { Db, MongoClient } from 'mongodb'
// @ts-ignore
export const db: Db = cloud.mongo.db
// @ts-ignore
export const client: MongoClient = cloud.mongo.client
// const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWD}@cockroachdb-global.cockroach-operator-system.svc:26257/defaultdb`
const connectionString = `postgresql://${process.env.PG_TEST_R}:${process.env.PG_TEST_P}@sgs.sealos.run:32147/defaultdb`


types.setTypeParser(20, function (val: string) {
    return BigInt(val)
})

export const pgPool = new Pool({
    connectionString: connectionString,
    max: 20,                 // 连接池最大连接数
    idleTimeoutMillis: 10000, // 空闲连接超时时间，毫秒
    connectionTimeoutMillis: 2000, // 连接超时时间，毫秒
    // ssl: {
    //     ca: process.env.PG_CA,
    //     rejectUnauthorized: false  // 不验证SSL证书
    // }
})