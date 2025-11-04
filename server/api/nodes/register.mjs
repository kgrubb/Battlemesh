import { eventHandler, readBody, createError } from 'h3'
import * as stateManager from '../../utils/gameStateManager.mjs'
import { getNextCaptureName, markNatoNameAsUsed } from '../../utils/nodeNames.mjs'
import { publish, publishState } from '../../utils/sseBus.mjs'
import { addActivity } from '../../utils/gameStateManager.mjs'
import { requireAdminPin } from '../../utils/adminAuth.mjs'

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const mode = body?.mode
  let natoName = body?.natoName || null

  if (!mode) {
    throw createError({ statusCode: 400, statusMessage: 'mode required' })
  }

  if (mode === 'admin') {
    requireAdminPin(event)
    // Admin fixed identity
    natoName = 'HQ Command'
  } else {
    // capture-point mode
    if (!natoName) {
      natoName = getNextCaptureName()
      stateManager.assignNatoName(natoName)
      markNatoNameAsUsed(natoName)
    } else {
      stateManager.updateNatoNameLastSeen(natoName)
      // Ensure capture point exists if client reconnects with a pre-assigned name
      const existing = stateManager.getState().capturePoints.find(cp => cp.id === natoName)
      if (!existing) {
        stateManager.assignNatoName(natoName)
      }
    }
  }

  // Update node tracking in server state
  const state = stateManager.getState()
  let node = state.nodes.find(n => n.id === natoName)
  if (!node) {
    node = { id: natoName, mode, status: 'online', lastSeen: Date.now() }
    state.nodes.push(node)
  } else {
    node.status = 'online'
    node.lastSeen = Date.now()
  }

  // Ensure capture point exists for capture-point mode
  publish('node-joined', { natoName, mode, timestamp: Date.now() })
  if (mode !== 'admin') {
    addActivity('node-join', `Node connected (${state.nodes.filter(n => n.mode === 'capture-point' && n.status === 'online').length} total)`) 
  }
  publishState(state)

  return {
    natoName,
    state: {
      teams: state.teams,
      capturePoints: state.capturePoints,
      gameActive: state.gameActive,
      gameStartTime: state.gameStartTime,
      activityFeed: state.activityFeed
    }
  }
})


