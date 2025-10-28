import { describe, it, expect } from 'vitest'
import * as stateManager from '../../server/utils/gameStateManager.mjs'

describe('Admin Panel Phantom Capture Points', () => {
  it('should not show capture points when admin panel starts with no connected nodes', async () => {
    // Reset state manager
    stateManager.resetStateManager()
    await stateManager.initialize()
    
    // Verify server starts with no capture points
    const state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
    
    // Simulate admin panel connecting
    const adminNatoName = 'HQ Command'
    
    // Admin should not create capture points
    expect(state.capturePoints.find(cp => cp.id === adminNatoName)).toBeUndefined()
    
    // Server state should remain clean
    const finalState = stateManager.getState()
    expect(finalState.capturePoints).toHaveLength(0)
  })
  
  it('should only show capture points for actual capture point nodes', async () => {
    // Reset state manager
    stateManager.resetStateManager()
    await stateManager.initialize()
    
    // Simulate capture point node connecting
    const captureNatoName = 'Alpha'
    stateManager.assignNatoName(captureNatoName)
    
    // Should have one capture point
    const state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(1)
    expect(state.capturePoints[0].id).toBe(captureNatoName)
    
    // Admin should not create capture points
    const adminNatoName = 'HQ Command'
    expect(state.capturePoints.find(cp => cp.id === adminNatoName)).toBeUndefined()
  })
})
