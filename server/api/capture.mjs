import { eventHandler, readBody } from 'h3'
import * as stateManager from '../utils/gameStateManager.mjs'

export default eventHandler(async (event) => {
  const { natoName, teamId } = await readBody(event)
  if (!natoName || teamId === undefined) {
    return { ok: false, error: 'natoName and teamId required' }
  }
  await stateManager.handleCaptureEvent(natoName, teamId)
  return { ok: true }
})


