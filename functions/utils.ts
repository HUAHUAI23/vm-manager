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

export const ReconcileStateJob = Cron("*/2 * * * * *", {
    catch: true,
    paused: true,
    unref: true,                  // 允许进程在定时器运行时退出（Node.js 和 Deno 环境）
    protect: true
})

