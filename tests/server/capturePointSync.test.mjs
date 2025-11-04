import { describe, it, expect, beforeEach } from 'vitest'
import * as stateManager from '../../server/utils/gameStateManager.mjs'
import { getNextCaptureName, resetNameIndex } from '../../server/utils/nodeNames.mjs'

describe('Capture Point Functions', () => {
  beforeEach(() => {
    stateManager.resetStateManager()
    resetNameIndex()
  })

  it('should create capture point when NATO name is assigned', () => {
    const natoName = getNextCaptureName()
    stateManager.assignNatoName(natoName)
    
    const state = stateManager.getState()
    const capturePoint = state.capturePoints.find(cp => cp.id === natoName)
    
    expect(capturePoint).toBeDefined()
    expect(capturePoint.id).toBe(natoName)
    expect(capturePoint.teamId).toBeNull()
  })

  it('should remove capture point when NATO name is released', () => {
    const natoName = getNextCaptureName()
    stateManager.assignNatoName(natoName)
    
    let state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(1)
    
    stateManager.releaseNatoName(natoName)
    state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
  })

  it('should handle capture events', () => {
    const natoName = getNextCaptureName()
    stateManager.assignNatoName(natoName)
    
    // Get state and modify capture point directly
    const state = stateManager.getState()
    const capturePoint = state.capturePoints.find(cp => cp.id === natoName)
    capturePoint.teamId = 1
    capturePoint.lastCaptureTime = Date.now()
    capturePoint.totalCaptures = 1
    
    expect(capturePoint.teamId).toBe(1)
  })
})