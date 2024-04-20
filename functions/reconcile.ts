import { EventEmitter } from 'events'
import { db } from './db'
import { CloudVirtualMachine } from './entity'
import { State, Phase } from './entity'
import { ReconcileStateJob } from './utils'
import { handlerCreateEvents } from './handler/create-events'
import { handlerStartEvents } from './handler/start-events'
import { handleRestartEvents } from './handler/restart-events'
import { handlerStopEvents } from './handler/stop-events'
import { handlerDeleteEvents } from './handler/delete-events'
import { handlerChangeEvents } from './handler/change-events'
import { stateChangeLockTime } from './constants'
import { Cron } from "croner"

// 创建事件发射器
const eventEmitter = new EventEmitter()

// 定义事件类型
const EVENT_CREATE = 'create'
const EVENT_START = 'start'
const EVENT_RESTART = 'restart'
const EVENT_STOP = 'stop'
const EVENT_CHANGE = 'change'
const EVENT_DELETE = 'delete'

// 定义状态同步函数
async function reconcileState() {
    try {
        const collection = db.collection<CloudVirtualMachine>('CloudVirtualMachine')

        // 创建
        const create = await collection.findOneAndUpdate({
            lockedAt: {
                $lt: new Date(Date.now() - stateChangeLockTime),
            },
            state: State.Running,
            phase: {
                $in: [Phase.Creating, Phase.Created]

            }
        }, {
            $set: { lockedAt: new Date() }

        })

        const createDoc = create.value
        if (createDoc) { eventEmitter.emit(EVENT_CREATE, createDoc) }

        // 启动
        const start = await collection.findOneAndUpdate(
            {
                lockedAt: {
                    $lt: new Date(Date.now() - stateChangeLockTime),
                },
                state: State.Running,
                phase: Phase.Starting
            },
            {
                $set: { lockedAt: new Date() }
            })

        const startDoc = start.value
        if (startDoc) { eventEmitter.emit(EVENT_START, startDoc) }

        // 重启
        const restart = await collection.findOneAndUpdate(
            {
                lockedAt: {
                    $lt: new Date(Date.now() - stateChangeLockTime),
                },
                state: State.Restarting,
                phase: {
                    $in:
                        [Phase.Started, Phase.Stopping, Phase.Stopped, Phase.Starting]
                }
            }, {
            $set: {
                lockedAt: new Date()
            }
        }
        )

        const restartDoc = restart.value
        if (restartDoc) { eventEmitter.emit(EVENT_RESTART, restartDoc) }

        // 关闭
        const stop = await collection.findOneAndUpdate(
            {
                lockedAt: {
                    $lt: new Date(Date.now() - stateChangeLockTime),
                },
                state: State.Stopped,
                phase: Phase.Stopping
            }, {
            $set: {
                lockedAt: new Date()
            }
        }
        )

        const stopDoc = stop.value
        if (stopDoc) { eventEmitter.emit(EVENT_STOP, stopDoc) }

        // 删除
        const destroy = await collection.findOneAndUpdate(
            {
                lockedAt: {
                    $lt: new Date(Date.now() - stateChangeLockTime),
                },
                state: State.Deleted,
                phase: { $in: [Phase.Deleting, Phase.Deleted] }
            }, {
            $set: {
                lockedAt: new Date()
            }
        }
        )

        const deleteDoc = destroy.value
        if (deleteDoc) { eventEmitter.emit(EVENT_DELETE, deleteDoc) }

        // 变更
        const change = await collection.findOneAndUpdate(
            {
                lockedAt: {
                    $lt: new Date(Date.now() - stateChangeLockTime),
                },
                state: State.Changing,
                phase: Phase.Stopped
            },
            {
                $set: {
                    lockedAt: new Date()
                }
            }
        )

        const changeDoc = change.value
        if (changeDoc) { eventEmitter.emit(EVENT_CHANGE, changeDoc) }


    } catch (error) {
        console.error('Error in reconcileState:', error)
    }
}

const reconcileStateJob: Cron = ReconcileStateJob
reconcileStateJob.schedule(() => {
    reconcileState() // 调用 reconcileState() 函数
})

reconcileStateJob.resume()


// 注册事件处理程序
eventEmitter.on(EVENT_CREATE, (vm: CloudVirtualMachine) => {
    handlerCreateEvents(vm)
})

eventEmitter.on(EVENT_START, (vm: CloudVirtualMachine) => {
    handlerStartEvents(vm)
})

eventEmitter.on(EVENT_RESTART, (vm: CloudVirtualMachine) => {
    handleRestartEvents(vm)
})

eventEmitter.on(EVENT_STOP, (vm: CloudVirtualMachine) => {
    handlerStopEvents(vm)
})

eventEmitter.on(EVENT_DELETE, (vm: CloudVirtualMachine) => {
    handlerDeleteEvents(vm)
})

eventEmitter.on(EVENT_CHANGE, (vm: CloudVirtualMachine) => {
    handlerChangeEvents(vm)
})

export const reconcile = { eventEmitter: eventEmitter, reconcileStateJob: reconcileStateJob } 