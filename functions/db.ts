import cloud from '@lafjs/cloud'
import pg, { PoolConfig } from 'pg'
const { Pool, types } = pg
import { Db, MongoClient } from 'mongodb'
import CONSTANTS from './constants'
// @ts-ignore
export const db: Db = cloud.mongo.db
// @ts-ignore
export const client: MongoClient = cloud.mongo.client

let connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWD}@cockroachdb-global.cockroach-operator-system.svc:26257/defaultdb`


if (CONSTANTS.IS_DEV) {
    connectionString = `postgresql://${process.env.PG_TEST_R}:${process.env.PG_TEST_P}@sgs.sealos.run:32147/defaultdb`
}



types.setTypeParser(20, function (val: string) {
    return BigInt(val)
})

let poolConfig: PoolConfig = {
    connectionString: connectionString,
    max: 20,                 // 连接池最大连接数
    idleTimeoutMillis: 10000, // 空闲连接超时时间，毫秒
    connectionTimeoutMillis: 2000, // 连接超时时间，毫秒
    ssl: {
        ca: process.env.PG_CA,
        rejectUnauthorized: false  // 不验证SSL证书
    }
}

if (CONSTANTS.IS_DEV) {
    poolConfig = {
        connectionString: connectionString,
        max: 20,                 // 连接池最大连接数
        idleTimeoutMillis: 10000, // 空闲连接超时时间，毫秒
        connectionTimeoutMillis: 2000, // 连接超时时间，毫秒
    }
}


export const pgPool = new Pool(poolConfig)