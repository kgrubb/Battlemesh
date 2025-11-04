import { eventHandler, readBody } from 'h3'
import * as stateManager from '../../utils/gameStateManager.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler(async (event) => {
  requireAdminPin(event)
  const { name, color } = await readBody(event)
  const team = await stateManager.addTeam(name, color)
  return team
})


