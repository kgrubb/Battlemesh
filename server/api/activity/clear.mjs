import { eventHandler } from 'h3'
import { clearActivityFeed, getState } from '../../utils/gameStateManager.mjs'
import { publishState, publish } from '../../utils/sseBus.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler((event) => {
  requireAdminPin(event)
  clearActivityFeed()
  publish('activity-cleared', {})
  publishState(getState())
  return { ok: true }
})


