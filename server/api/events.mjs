import { eventHandler } from 'h3'
import { subscribe } from '../utils/sseBus.mjs'
import * as stateManager from '../utils/gameStateManager.mjs'

export default eventHandler((event) => {
  // Attach getState for tick usage
  event.getState = stateManager.getState
  subscribe(event)
})


