import cloud from '@lafjs/cloud'
import { reconcile } from './reconcile'
import { billingJob } from './billing-task'
import util from 'util'

// 添加任务监测的扒插系统
export default async function (ctx: FunctionContext) {
  if (ctx.body.secret !== process.env.DEBUG_SECRET) {
    return
  }
  console.log('debug')
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
  console.log(token)
}
// 2
function checkJobIsRunning() {
  console.log('reconcile job isStopped: ', reconcile.reconcileStateJob.isStopped())
  console.log('reconcile job isBusy: ', reconcile.reconcileStateJob.isBusy())
  console.log('reconcile Job isRunning: ', reconcile.reconcileStateJob.isRunning())
  console.log('billing job isStopped: ', billingJob.isStopped())
  console.log('billing job isBusy: ', billingJob.isBusy())
  console.log('billing job isRunning: ', billingJob.isRunning())
  console.log('-------------------')
  console.log('reconcileStateJob: ', util.inspect(reconcile.reconcileStateJob, { showHidden: false, depth: 2 }))
  console.log('-------------------')
  console.log('biling job: ', util.inspect(billingJob, { showHidden: false, depth: 2 }))
}
// 3
function pauseJob() {
  console.log(`Pause job ${reconcile.reconcileStateJob.name}...`)
  reconcile.reconcileStateJob.pause()
}
// 4 
function resumeJob() {
  console.log(`Resume job ${reconcile.reconcileStateJob.name}...`)
  reconcile.reconcileStateJob.resume()
}