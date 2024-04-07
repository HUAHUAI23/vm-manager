import cloud from '@lafjs/cloud'
import { Cron } from "croner"
export function verifyBearerToken(token: string) {
    const payload = cloud.parseToken(token)
    if (payload === null) {
        return false
    }
    return {
        namespace: payload.workspaceId,
        sealosUserId: payload.userId
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

export const ReconcileStateJob =  Cron("*/2 * * * * *", {
    catch: true,
    paused: true,
    unref: true,                  // 允许进程在定时器运行时退出（Node.js 和 Deno 环境）
    protect: true
})
