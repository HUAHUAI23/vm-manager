import CONSTANTS from '@/constants'
import { db } from '@/db'
import { CloudVirtualMachine } from '@/entity'
import cloud from '@lafjs/cloud'

export default async function (ctx: FunctionContext) {
    const token = ctx.body.token
    if (typeof token !== 'string') {
        return { data: null, error: 'Expected a string as token' }
    }

    const payload = cloud.parseToken(token, CONSTANTS.SEALOS_ACCOUNT_MERGE_SECRET)

    if (payload === null) {
        return { data: null, error: 'Unauthorized' }
    }

    // master
    const mergedBy = payload.userUid

    // secondary
    const userId = payload.mergeUserUid

    let machineCount = await db.collection<CloudVirtualMachine>('CloudVirtualMachine')
        .countDocuments({
            sealosUserUid: userId,
        })


    if (machineCount === 0) {
        return { data: 'ok', error: null }
    }


    await db.collection<CloudVirtualMachine>('CloudVirtualMachine').updateMany(
        { sealosUserUid: userId },
        { $set: { sealosUserUid: mergedBy } }
    )

    machineCount = await db.collection<CloudVirtualMachine>('CloudVirtualMachine')
        .countDocuments({
            sealosUserUid: userId,
        })

    if (machineCount !== 0) {
        return { data: null, error: 'Failed to merge' }
    }

    return { data: 'ok', error: null }
}