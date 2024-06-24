export default class CONSTANTS {
    // 返回1970-01-01 00:00:00的日期对象
    static get TASK_LOCK_INIT_TIME(): Date {
        return new Date(0)
    }

    // 返回计费上锁超时时间，单位为毫秒 (15秒)
    static get BILLING_LOCK_TIMEOUT(): number {
        return 15 * 1000
    }

    // 返回计费周期，单位为毫秒 (1小时)
    static get BILLING_INTERVAL(): number {
        return 60 * 60 * 1000
    }

    // 返回状态变更上锁超时时间，单位为毫秒 (15秒)
    static get STATE_CHANGE_LOCK_TIMEOUT(): number {
        return 15 * 1000
    }

    // 返回超时时间，单位为毫秒 (5分钟)
    static get TIMEOUT(): number {
        return 1000 * 60 * 5
    }

    // 返回休眠时间，单位为毫秒 (2秒)
    static get SLEEP_TIME(): number {
        return 1000 * 2
    }

    // 加密密钥
    static get CRYPTO_KEY(): string {
        return process.env.CRYPTO_KEY
    }

    // 人民币 对应 sealos 币 比例
    static get RMB_TO_SEALOS(): number {
        return 1000000
    }

    static get SEALOS_ACCOUNT_MERGE_SECRET(): string {
        return 'aaaaa'
    }
}
