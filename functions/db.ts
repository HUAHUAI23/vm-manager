import cloud from '@lafjs/cloud'
import { Db } from 'mongodb'
// @ts-ignore
export const db: Db = cloud.mongo.db
