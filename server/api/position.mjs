import { eventHandler, readBody } from 'h3'
import * as stateManager from '../utils/gameStateManager.mjs'

export default eventHandler(async (event) => {
  const { natoName, position, type } = await readBody(event)
  if (!natoName || !position) {
    return { ok: false, error: 'natoName and position required' }
  }
  await stateManager.updateCapturePointPosition(natoName, position, type || 'gps')
  return { ok: true }
})


