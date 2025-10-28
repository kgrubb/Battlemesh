import { describe, it, expect, beforeEach } from 'vitest'
import * as stateManager from '../../server/utils/gameStateManager.mjs'
import { getNextAvailableNatoName, resetNameIndex } from '../../server/utils/nodeNames.mjs'

describe('Capture Point Synchronization', () => {
  beforeEach(async () => {
    // Reset state for each test
    await stateManager.clearState()
    await stateManager.initialize()
    resetNameIndex()
  })

  it('should create capture point when NATO name is assigned', async () => {
    // Assign a NATO name
    const natoName = getNextAvailableNatoName()
    stateManager.assignNatoName(natoName)
    
    // Check that capture point was created
    const state = stateManager.getState()
    const capturePoint = state.capturePoints.find(cp => cp.id === natoName)
    
    expect(capturePoint).toBeDefined()
    expect(capturePoint.id).toBe(natoName)
    expect(capturePoint.teamId).toBeNull()
    expect(capturePoint.position).toBeNull()
    expect(capturePoint.totalCaptures).toBe(0)
  })

  it('should remove capture point when NATO name is released', async () => {
    // Assign a NATO name and create capture point
    const natoName = getNextAvailableNatoName()
    stateManager.assignNatoName(natoName)
    
    // Verify capture point exists
    let state = stateManager.getState()
    expect(state.capturePoints.find(cp => cp.id === natoName)).toBeDefined()
    
    // Release NATO name
    stateManager.releaseNatoName(natoName)
    
    // Verify capture point was removed
    state = stateManager.getState()
    expect(state.capturePoints.find(cp => cp.id === natoName)).toBeUndefined()
  })

  it('should not create duplicate capture points for same NATO name', async () => {
    const natoName = getNextAvailableNatoName()
    
    // Assign NATO name twice
    stateManager.assignNatoName(natoName)
    stateManager.assignNatoName(natoName)
    
    // Should only have one capture point
    const state = stateManager.getState()
    const capturePoints = state.capturePoints.filter(cp => cp.id === natoName)
    expect(capturePoints).toHaveLength(1)
  })

  it('should not persist capture points to state file', async () => {
    const natoName = getNextAvailableNatoName()
    stateManager.assignNatoName(natoName)
    
    // Force save
    await stateManager.saveState()
    
    // Create a new state manager instance to simulate server restart
    const newStateManager = await import('../../server/utils/gameStateManager.mjs')
    await newStateManager.initialize()
    
    // Check that capture point was NOT restored (ephemeral)
    const state = newStateManager.getState()
    const capturePoint = state.capturePoints.find(cp => cp.id === natoName)
    expect(capturePoint).toBeUndefined()
    
    // Clean up
    await newStateManager.clearState()
  })
})
