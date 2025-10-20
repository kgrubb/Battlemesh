import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('Capture Button', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should initialize capture point for node', async () => {
    const gameState = useGameState()
    await gameState.initialize({ nodeMode: 'capture-point' })
    
    // Simulate NATO name assignment
    gameState.localNodeName = 'Alpha'
    
    // Simulate initialization from capture-point page
    gameState.nodes = [{ id: 'Alpha', mode: 'capture-point', status: 'online' }]
    gameState.capturePoints = [{
      id: 'Alpha', // NATO name is the ID
      teamId: null,
      position: null,
      lastCaptureTime: null,
      totalCaptures: 0
    }]
    
    expect(gameState.localCapturePoint).toBeTruthy()
    expect(gameState.localCapturePoint.id).toBe('Alpha')
  })
  
  it('should create capture event when team is captured', async () => {
    const gameState = useGameState()
    await gameState.initialize({ nodeMode: 'capture-point' })
    
    // Simulate NATO name assignment
    gameState.localNodeName = 'Bravo'
    
    gameState.nodes = [{ id: 'Bravo', mode: 'capture-point', status: 'online' }]
    gameState.capturePoints = [{
      id: 'Bravo', // NATO name is the ID
      teamId: null,
      position: null,
      lastCaptureTime: null,
      totalCaptures: 0
    }]
    
    const event = gameState.captureForTeam(1)
    
    expect(event.type).toBe('capture-event')
    expect(event.natoName).toBe('Bravo') // Uses NATO name
    expect(event.teamId).toBe(1)
    
    const cp = gameState.localCapturePoint
    expect(cp.teamId).toBe(1)
    expect(cp.totalCaptures).toBe(1)
  })
  
  it('should capture for team', async () => {
    const gameState = useGameState()
    await gameState.initialize({ nodeMode: 'capture-point' })
    
    // Simulate NATO name assignment
    gameState.localNodeName = 'Charlie'
    
    gameState.nodes = [{ id: 'Charlie', mode: 'capture-point', status: 'online' }]
    gameState.capturePoints = [{
      id: 'Charlie', // NATO name is the ID
      teamId: null,
      position: null,
      lastCaptureTime: null,
      totalCaptures: 0
    }]
    
    const event = gameState.captureForTeam(2)
    
    expect(event).toBeTruthy()
    expect(event.teamId).toBe(2)
    expect(gameState.localCapturePoint.teamId).toBe(2)
  })
})
