import { eventHandler, readBody } from 'h3'
import * as stateManager from '../../utils/gameStateManager.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler(async (event) => {
  requireAdminPin(event)
  const { teamId } = await readBody(event)
  stateManager.removeTeam(teamId)
  return { ok: true }
})


