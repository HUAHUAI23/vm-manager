import cloud from '@lafjs/cloud'
import { Cron } from "croner"
import { pgPool } from './db'
import { Decimal } from 'decimal.js'
import { encrypt, deCrypt } from './crypto'
import { PoolClient, QueryConfig } from 'pg'

type SealosAccount = {
    activityBonus: bigint
    encryptBalance: string
    encryptDeductionBalance: string
    created_at: string // new Date().toISOString() utc 字符串
    create_region_id: string
    balance: bigint
    deduction_balance: bigint
    userUid: string
}


export function verifyBearerToken(token: string) {
    if (typeof token !== 'string') {
        throw new Error('Expected a string as authHeader')
    }

    const payload = cloud.parseToken(token)
    if (payload === null) {
        return false
    }
    return {
        sealosNamespace: payload.workspaceId,
        sealosUserId: payload.userId,
        sealosUserUid: payload.userUid,
        sealosRegionUid: payload.regionUid
    }
}

// export function validateDTO(dto, schema) {
//     if (Object.keys(dto).length === 0) {
//         throw new Error("DTO cannot be empty")
//     }

//     // Validate presence and values of required keys
//     for (const key in schema) {
//         if (!dto.hasOwnProperty(key)) {
//             throw new Error(`Missing required key '${key}'`)
//         }

//         const isValid = schema[key](dto[key])
//         if (!isValid) {
//             throw new Error(`Invalid value for key '${key}'`)
//         }
//     }

//     // Check for any keys not present in the schema
//     for (const key in dto) {
//         if (!schema.hasOwnProperty(key)) {
//             throw new Error(`Key '${key}' is not allowed`)
//         }
//     }

//     // If all checks pass, return true
//     return true
// }

type ValidatorFn = (value: any) => boolean

export interface Schema {
    [key: string]: ValidatorFn | Schema | { optional: true, validate: ValidatorFn | Schema }
}

export function validateDTO(dto: any, schema: Schema) {
    if (Object.keys(dto).length === 0) {
        throw new Error("DTO cannot be empty")
    }

    const validate = (obj: any, sch: Schema, path = '') => {
        for (const key in sch) {
            const fullPath = path ? `${path}.${key}` : key
            const value = obj[key]
            const validatorOrSchema = sch[key]

            if (typeof validatorOrSchema === 'function') {
                if (!obj.hasOwnProperty(key)) {
                    throw new Error(`Missing required key '${fullPath}'`)
                }
                const isValid = (validatorOrSchema as ValidatorFn)(value)
                if (!isValid) {
                    throw new Error(`Invalid value for key '${fullPath}'`)
                }
            } else if (typeof validatorOrSchema === 'object' && 'optional' in validatorOrSchema) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof validatorOrSchema.validate === 'function') {
                        const isValid = (validatorOrSchema.validate as ValidatorFn)(value)
                        if (!isValid) {
                            throw new Error(`Invalid value for key '${fullPath}'`)
                        }
                    } else {
                        validate(value, validatorOrSchema.validate as Schema, fullPath)
                    }
                }
            } else {
                if (!obj.hasOwnProperty(key)) {
                    throw new Error(`Missing required key '${fullPath}'`)
                }
                validate(value, validatorOrSchema as Schema, fullPath)
            }
        }

        for (const key in obj) {
            const fullPath = path ? `${path}.${key}` : key
            if (!sch.hasOwnProperty(key)) {
                const keyIsValid = Object.keys(sch).some(schemaKey => {
                    const schemaEntry = sch[schemaKey]
                    if (typeof schemaEntry === 'object' && 'optional' in schemaEntry && schemaEntry.optional) {
                        if (typeof schemaEntry.validate === 'object') {
                            return key in schemaEntry.validate
                        }
                    }
                    return false
                })
                if (!keyIsValid) {
                    throw new Error(`Key '${fullPath}' is not allowed`)
                }
            }
        }
    }

    validate(dto, schema)

    return true
}






export function validatePeriod(period: number): boolean {
    const validPeriods: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 36]
    if (validPeriods.includes(period)) {
        return true
    }
    throw new Error(`Invalid period: '${period}' is not in the valid periods: [${validPeriods.join(', ')}]`)
}


export async function getSealosUserAccount(sealosUserUid: string) {
    const query: QueryConfig<string[]> = {
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

        const sealosAccount: SealosAccount = res.rows[0]

        const account = new Decimal(sealosAccount.balance.toString()).minus(sealosAccount.deduction_balance.toString())
        const sealosUserAccountRMB = account.div(new Decimal('1000000'))
        console.log(sealosUserAccountRMB.toNumber())

        return sealosUserAccountRMB.toNumber()

    } catch (error) {
        console.error('Error executing query', error.stack)
        throw error
    }

}

export async function validationEncrypt(sealosUserUid: string): Promise<boolean> {

    const query: QueryConfig<string[]> = {
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

        const sealosAccount: SealosAccount = res.rows[0]

        if (deCrypt(sealosAccount.encryptDeductionBalance) !== sealosAccount.deduction_balance.toString()) {
            return false
        }

        return true

    } catch (error) {
        console.error('validate encrypt failed', error.stack)
        throw error
    }
}

export async function deductSealosBalance(sealosUserUid: string, deductionAmount: bigint, client: PoolClient) {

    const query: QueryConfig<string[]> = {
        text: 'SELECT * FROM "Account" WHERE "userUid" = $1',
        values: [sealosUserUid],  // 将userUid作为参数传递给查询
    }


    try {
        const res = await client.query(query)

        const account: SealosAccount = res.rows[0]

        const newDeductionBalance = BigInt(deductionAmount) + BigInt(account.deduction_balance)

        const newEncryptedDeductionBalance = encrypt(newDeductionBalance.toString())

        const updateQuery: QueryConfig<string[]> = {
            text: 'UPDATE "Account" SET "deduction_balance" = $1, "encryptDeductionBalance" = $2 WHERE "userUid" = $3',
            values: [newDeductionBalance.toString(), newEncryptedDeductionBalance, sealosUserUid],
        }

        await client.query(updateQuery)
    } catch (error) {
        console.error('Error executing deduce sealos balance', error.stack)
        throw error
    }

}

export function sleep(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export const ReconcileStateJob = Cron("*/5 * * * * *", {
    // name: "ReconcileStateJob",
    catch: true,
    paused: true,
    unref: true,                  // 允许进程在定时器运行时退出（Node.js 和 Deno 环境）
    protect: true
})

export const BillingJob = Cron("0 * * * * *", {
    // name: "BillingJob",
    catch: true,
    paused: true,
    unref: true,                  // 允许进程在定时器运行时退出（Node.js 和 Deno 环境）
    protect: true
})