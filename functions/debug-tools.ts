import cloud from '@lafjs/cloud'
import { reconcile } from './reconcile'
import { billingJob } from './billing-task'
import util from 'util'

// 添加任务监测的扒插系统
export default async function (ctx: FunctionContext) {
  if (ctx.body.secret !== process.env.DEBUG_SECRET) {
    return
  }
  console.info('debug')
  switch (ctx.body.key) {
    case 1:
      generateTestToken()
      break
    case 2:
      checkJobIsRunning()
      break
    case 3:
      pauseJob()
      break
    case 4:
      resumeJob()
      break

    default:
      break
  }

  return { data: 'hi, laf' }
}

function generateTestToken() {
  // 1
  const payload = {
    workspaceId: 'sealos',
    userId: 'huahua',
    exp: Date.now() + 60 * 60 * 24 * 7, // 有效期为 7 天
  }
  const token = cloud.getToken(payload)
  console.info(token)
}
// 2
function checkJobIsRunning() {
  console.info('reconcile job isStopped: ', reconcile.reconcileStateJob.isStopped())
  console.info('reconcile job isBusy: ', reconcile.reconcileStateJob.isBusy())
  console.info('reconcile Job isRunning: ', reconcile.reconcileStateJob.isRunning())
  console.info('billing job isStopped: ', billingJob.isStopped())
  console.info('billing job isBusy: ', billingJob.isBusy())
  console.info('billing job isRunning: ', billingJob.isRunning())
  console.info('-------------------')
  console.info('reconcileStateJob: ', util.inspect(reconcile.reconcileStateJob, { showHidden: false, depth: 2 }))
  console.info('-------------------')
  console.info('biling job: ', util.inspect(billingJob, { showHidden: false, depth: 2 }))
}
// 3
function pauseJob() {
  console.info(`Pause job ${reconcile.reconcileStateJob.name}...`)
  reconcile.reconcileStateJob.pause()
}
// 4 
function resumeJob() {
  console.info(`Resume job ${reconcile.reconcileStateJob.name}...`)
  reconcile.reconcileStateJob.resume()
}