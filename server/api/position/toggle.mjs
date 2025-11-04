import { eventHandler, readBody } from 'h3'
import * as stateManager from '../../utils/gameStateManager.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler(async (event) => {
  requireAdminPin(event)
  const { natoName } = await readBody(event)
  if (!natoName) return { ok: false, error: 'natoName required' }
  stateManager.toggleCapturePointPositionSource(natoName)
  return { ok: true }
})


