import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('Node Persistence Functions', () => {
  let gameState

  beforeEach(() => {
    setActivePinia(createPinia())
    gameState = useGameState()
    gameState.nodeMode = 'admin'
    gameState.initializeGame()
  })

  it('should maintain nodes when syncing from server', () => {
    gameState.addNode('Alpha', 'capture-point')
    gameState.addNode('Bravo', 'capture-point')
    
    const initialNodeCount = gameState.nodes.length
    expect(initialNodeCount).toBe(3) // 2 added + 1 admin node from initializeGame
    
    const serverState = {
      teams: gameState.teams,
      capturePoints: gameState.capturePoints,
      gameActive: false,
      gameStartTime: null
    }
    
    gameState.syncFromServer(serverState)
    
    expect(gameState.nodes).toHaveLength(initialNodeCount)
    expect(gameState.nodes.find(n => n.id === 'Alpha')).toBeDefined()
    expect(gameState.nodes.find(n => n.id === 'Bravo')).toBeDefined()
  })

  it('should handle node disconnection', () => {
    gameState.addNode('Alpha', 'capture-point')
    gameState.addNode('Bravo', 'capture-point')
    
    gameState.handleNodeDisconnect('Alpha')
    
    expect(gameState.nodes).toHaveLength(3) // 2 added + 1 admin node from initializeGame
    expect(gameState.nodes.find(n => n.id === 'Alpha').status).toBe('offline')
    expect(gameState.nodes.find(n => n.id === 'Bravo').status).toBe('online')
  })
})