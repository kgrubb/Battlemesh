import { describe, it, expect } from 'vitest'
import * as stateManager from '../../server/utils/gameStateManager.mjs'

describe('GameStateManager Functions', () => {
  it('should initialize with default teams', async () => {
    stateManager.resetStateManager()
    await stateManager.initialize()
    
    const state = stateManager.getState()
    expect(state.capturePoints).toHaveLength(0)
    expect(state.teams).toHaveLength(2) // Default teams
    expect(state.nodes).toHaveLength(0)
  })

  it('should assign NATO names', () => {
    stateManager.resetStateManager()
    
    stateManager.assignNatoName('Alpha')
    const assigned = stateManager.getAssignedNatoNames()
    expect(assigned).toHaveProperty('Alpha')
  })

  it('should release NATO names', () => {
    stateManager.resetStateManager()
    
    stateManager.assignNatoName('Alpha')
    stateManager.releaseNatoName('Alpha')
    const assigned = stateManager.getAssignedNatoNames()
    expect(assigned).not.toHaveProperty('Alpha')
  })

  it('should get state', () => {
    stateManager.resetStateManager()
    
    const state = stateManager.getState()
    expect(state).toBeDefined()
    expect(typeof state).toBe('object')
  })
})