import { reconcile } from './reconcile'
import util from 'util'
export default async function (ctx: FunctionContext) {
  console.log('Job isRunning: ', reconcile.reconcileStateJob.isRunning())

  console.log('EventEmitter: ', util.inspect(reconcile.eventEmitter, { showHidden: false, depth: 2 }))

  console.log('init...')

  return { data: 'hi, laf' }
}
