import { eventHandler } from 'h3'
import { clearState, getState } from '../../utils/gameStateManager.mjs'
import { publishState } from '../../utils/sseBus.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler(async (event) => {
  requireAdminPin(event)
  await clearState()
  publishState(getState())
  return { ok: true }
})


