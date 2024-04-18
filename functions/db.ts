import cloud from '@lafjs/cloud'
import { Db, MongoClient } from 'mongodb'
// @ts-ignore
export const db: Db = cloud.mongo.db
// @ts-ignore
export const client: MongoClient = cloud.mongo.client
