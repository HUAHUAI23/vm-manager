import cloud from '@lafjs/cloud'
import pg from 'pg'
const { Pool } = pg
import { Db, MongoClient } from 'mongodb'
// @ts-ignore
export const db: Db = cloud.mongo.db
// @ts-ignore
export const client: MongoClient = cloud.mongo.client
const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWD}@hzh.sealos.run:43243/defaultdb?sslmode=require`

export const pgPool = new Pool({
    connectionString: connectionString,
    // host: 'hzh.sealos.run',       // 数据库服务器地址
    // user: process.env.PG_USER,   // 数据库用户名
    // password: process.env.PG_PASSWD, // 数据库密码
    // database: 'defaultdb',  // 数据库名称
    // port: 43243,              // 数据库端口，默认为5432
    max: 20,                 // 连接池最大连接数
    idleTimeoutMillis: 10000, // 空闲连接超时时间，毫秒
    connectionTimeoutMillis: 2000, // 连接超时时间，毫秒
    ssl: {
        rejectUnauthorized: false  // 不验证SSL证书
    }
})