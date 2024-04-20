import cloud from '@lafjs/cloud'
import { Cron } from "croner"
import { pgPool } from './db'
import { Decimal } from 'decimal.js'

export function verifyBearerToken(token: string) {
    if (typeof token !== 'string') {
        throw new Error('Expected a string as authHeader')
    }

    const payload = cloud.parseToken(token)
    if (payload === null) {
        return false
    }
    return {
        namespace: payload.workspaceId,
        sealosUserId: payload.userId,
        sealosUserUid: payload.userUid,
        sealosRegionUid: payload.regionUid
    }
}

export function validateDTO(dto, schema) {
    if (Object.keys(dto).length === 0) {
        throw new Error("DTO cannot be empty")
    }

    // Validate presence and values of required keys
    for (const key in schema) {
        if (!dto.hasOwnProperty(key)) {
            throw new Error(`Missing required key '${key}'`)
        }

        const isValid = schema[key](dto[key])
        if (!isValid) {
            throw new Error(`Invalid value for key '${key}'`)
        }
    }

    // Check for any keys not present in the schema
    for (const key in dto) {
        if (!schema.hasOwnProperty(key)) {
            throw new Error(`Key '${key}' is not allowed`)
        }
    }

    // If all checks pass, return true
    return true
}

export async function getSealosUserAccount(sealosUserUid: string) {
    const query = {
        text: 'SELECT * FROM "Account" WHERE "userUid" = $1',
        values: [sealosUserUid],  // 将userUid作为参数传递给查询
    }

    try {
        const res = await pgPool.query(query)

        if (res.rows.length === 0) {
            throw new Error('No account found with the given userUid.')
        }

        if (res.rows.length > 1) {
            throw new Error('Multiple accounts found with the given userUid.')
        }

        const sealosAccount = new Decimal(res.rows[0].balance).minus(res.rows[0].deduction_balance)
        const sealosUserAccountRMB = sealosAccount.div(new Decimal('1000000'))

        return sealosUserAccountRMB.toNumber()

    } catch (error) {
        console.error('Error executing query', error.stack)
        throw error
    }

}

export function sleep(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export const ReconcileStateJob = Cron("*/5 * * * * *", {
    name: "ReconcileStateJob",
    catch: true,
    paused: true,
    unref: true,                  // 允许进程在定时器运行时退出（Node.js 和 Deno 环境）
    protect: true
})

export const BillingJob = Cron("0 * * * * *", {
    name: "BillingJob",
    catch: true,
    paused: true,
    unref: true,                  // 允许进程在定时器运行时退出（Node.js 和 Deno 环境）
    protect: true
})
