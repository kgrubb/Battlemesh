import { describe, it, expect, beforeEach } from 'vitest'
import * as stateManager from '../../server/utils/gameStateManager.mjs'
import { getNextAvailableNatoName, resetNameIndex } from '../../server/utils/nodeNames.mjs'

describe('Ephemeral Capture Points', () => {
  beforeEach(async () => {
    // Reset state for each test
    await stateManager.clearState()
    await stateManager.initialize()
    resetNameIndex()
  })

  it('should start with empty capture points on server startup', async () => {
    const state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
    expect(Object.keys(state.assignedNatoNames)).toHaveLength(0)
  })

  it('should create capture points when nodes connect', async () => {
    const natoName = getNextAvailableNatoName()
    stateManager.assignNatoName(natoName)
    
    const state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(1)
    expect(state.capturePoints[0].id).toBe(natoName)
    expect(state.assignedNatoNames[natoName]).toBeDefined()
  })

  it('should remove capture points when nodes disconnect', async () => {
    const natoName = getNextAvailableNatoName()
    stateManager.assignNatoName(natoName)
    
    // Verify capture point was created
    let state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(1)
    
    // Disconnect node
    stateManager.releaseNatoName(natoName)
    
    // Verify capture point was removed
    state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
    expect(state.assignedNatoNames[natoName]).toBeUndefined()
  })

  it('should not persist capture points to state file', async () => {
    const natoName = getNextAvailableNatoName()
    stateManager.assignNatoName(natoName)
    
    // Force save
    await stateManager.saveState()
    
    // Create new state manager instance to simulate server restart
    const newStateManager = await import('../../server/utils/gameStateManager.mjs')
    await newStateManager.initialize()
    
    // Verify capture point was NOT restored (should be empty)
    const state = newStateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
    expect(Object.keys(state.assignedNatoNames)).toHaveLength(0)
    
    // Clean up
    await newStateManager.clearState()
  })

  it('should persist teams and game state but not capture points', async () => {
    // Create some capture points
    const natoName1 = getNextAvailableNatoName()
    const natoName2 = getNextAvailableNatoName()
    stateManager.assignNatoName(natoName1)
    stateManager.assignNatoName(natoName2)
    
    // Update game state
    stateManager.updateState({ gameActive: true, gameStartTime: Date.now() })
    
    // Force save
    await stateManager.saveState()
    
    // Create new state manager instance
    const newStateManager = await import('../../server/utils/gameStateManager.mjs')
    await newStateManager.initialize()
    
    const state = newStateManager.getState()
    
    // Teams should be restored
    expect(state.teams).toHaveLength(2)
    
    // Game state should be restored
    expect(state.gameActive).toBe(true)
    expect(state.gameStartTime).toBeDefined()
    
    // Capture points should NOT be restored (ephemeral)
    expect(state.capturePoints).toHaveLength(0)
    expect(Object.keys(state.assignedNatoNames)).toHaveLength(0)
    
    // Clean up
    await newStateManager.clearState()
  })
})
