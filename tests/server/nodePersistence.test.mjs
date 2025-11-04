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
    // Nodes are managed server-side; simulate server syncing nodes
    const serverState = {
      teams: gameState.teams,
      capturePoints: [],
      nodes: [
        { id: 'HQ Command', mode: 'admin', status: 'online', lastSeen: Date.now() },
        { id: 'Alpha', mode: 'capture-point', status: 'online', lastSeen: Date.now() },
        { id: 'Bravo', mode: 'capture-point', status: 'online', lastSeen: Date.now() }
      ],
      gameActive: false,
      gameStartTime: null
    }
    
    gameState.syncFromServer(serverState)
    
    expect(gameState.nodes).toHaveLength(3)
    expect(gameState.nodes.find(n => n.id === 'Alpha')).toBeDefined()
    expect(gameState.nodes.find(n => n.id === 'Bravo')).toBeDefined()
  })

  it('should handle node disconnection', () => {
    // Start with server-synced nodes
    const serverState = {
      teams: gameState.teams,
      capturePoints: [],
      nodes: [
        { id: 'HQ Command', mode: 'admin', status: 'online', lastSeen: Date.now() },
        { id: 'Alpha', mode: 'capture-point', status: 'online', lastSeen: Date.now() },
        { id: 'Bravo', mode: 'capture-point', status: 'online', lastSeen: Date.now() }
      ],
      gameActive: false,
      gameStartTime: null
    }
    gameState.syncFromServer(serverState)
    
    gameState.handleNodeDisconnect('Alpha')
    
    expect(gameState.nodes).toHaveLength(3)
    expect(gameState.nodes.find(n => n.id === 'Alpha')?.status).toBe('offline')
    expect(gameState.nodes.find(n => n.id === 'Bravo')?.status).toBe('online')
  })
})