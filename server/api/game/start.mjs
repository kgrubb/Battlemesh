import { eventHandler } from 'h3'
import * as stateManager from '../../utils/gameStateManager.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler((event) => {
  requireAdminPin(event)
  stateManager.startGame()
  return { ok: true }
})


