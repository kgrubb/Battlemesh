import { eventHandler } from 'h3'
import * as stateManager from '../../utils/gameStateManager.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler(async (event) => {
  requireAdminPin(event)
  await stateManager.resetGame()
  return { ok: true }
})


