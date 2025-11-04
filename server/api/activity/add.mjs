import { eventHandler, readBody } from 'h3'
import { addActivity, getState } from '../../utils/gameStateManager.mjs'
import { publishState, publish } from '../../utils/sseBus.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler(async (event) => {
  requireAdminPin(event)
  const body = await readBody(event)
  const activity = addActivity(body?.type, body?.message, body?.teamId)
  publish('activity', activity)
  publishState(getState())
  return activity
})


