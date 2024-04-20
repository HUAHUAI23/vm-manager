export const TASK_LOCK_INIT_TIME = new Date(0) // 1970-01-01 00:00:00
export const billingLockTimeOut = 15 * 1000  // 计费上锁超时时间 15s
export const billingInterval = 60 * 60 * 1000  // 计费周期 1h
export const stateChangeLockTime = 15 * 1000  // 状态变更上锁超时时间 15s
export const timeOut = 1000 * 60 * 5 // 5分钟
export const sleepTime = 1000 * 2 // 2s