import { describe, it, expect } from 'vitest'
import * as stateManager from '../../server/utils/gameStateManager.mjs'

describe('Admin Panel Clean Startup', () => {
  it('should start with no capture points when no nodes are connected', async () => {
    // Reset state manager
    stateManager.resetStateManager()
    
    // Initialize fresh state
    await stateManager.initialize()
    
    // Check that state starts clean
    const state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
    expect(Object.keys(state.assignedNatoNames)).toHaveLength(0)
    expect(state.teams).toHaveLength(2) // Should have default teams
  })
  
  it('should create capture points only when nodes connect', async () => {
    // Reset state manager
    stateManager.resetStateManager()
    await stateManager.initialize()
    
    // Initially no capture points
    let state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
    
    // Simulate node connection
    stateManager.assignNatoName('Alpha')
    
    // Now should have one capture point
    state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(1)
    expect(state.capturePoints[0].id).toBe('Alpha')
    
    // Simulate node disconnection
    stateManager.releaseNatoName('Alpha')
    
    // Should be back to no capture points
    state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
  })
})
