import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('GameState Store Unit Tests', () => {
  let gameState

  beforeEach(() => {
    setActivePinia(createPinia())
    gameState = useGameState()
    
    // Reset state
    gameState.nodeMode = 'capture-point'
    gameState.localNodeName = null
    gameState.teams = []
    gameState.capturePoints = []
    gameState.nodes = []
    gameState.networkMode = 'wifi'
    gameState.adminConnected = false
    gameState.gameActive = false
    gameState.gameStartTime = null
    gameState.scoringInterval = null
  })

  describe('State Initialization', () => {
    it('should initialize with default values', () => {
      expect(gameState.nodeMode).toBe('capture-point')
      expect(gameState.localNodeName).toBeNull()
      expect(gameState.teams).toEqual([])
      expect(gameState.capturePoints).toEqual([])
      expect(gameState.nodes).toEqual([])
      expect(gameState.networkMode).toBe('wifi')
      expect(gameState.adminConnected).toBe(false)
      expect(gameState.gameActive).toBe(false)
    })
  })

  describe('Getters', () => {
    it('should identify admin mode', () => {
      gameState.nodeMode = 'admin'
      expect(gameState.isAdmin).toBe(true)
      
      gameState.nodeMode = 'capture-point'
      expect(gameState.isAdmin).toBe(false)
    })

    it('should find local capture point', () => {
      gameState.localNodeName = 'Alpha'
      gameState.capturePoints = [{ id: 'Alpha', teamId: null }]
      
      const localCP = gameState.localCapturePoint
      expect(localCP).toBeDefined()
      expect(localCP.id).toBe('Alpha')
    })

    it('should filter online nodes', () => {
      gameState.nodes = [
        { id: 'Alpha', status: 'online' },
        { id: 'Bravo', status: 'offline' }
      ]
      
      const onlineNodes = gameState.onlineNodes
      expect(onlineNodes).toHaveLength(1)
      expect(onlineNodes[0].id).toBe('Alpha')
    })
  })

  describe('Team Management', () => {
    it('should return add-team-command', () => {
      gameState.nodeMode = 'admin'
      const command = gameState.addTeam('Red Team', '#ff0000')
      
      expect(command).toEqual({
        type: 'add-team-command',
        name: 'Red Team',
        color: '#ff0000',
        timestamp: expect.any(Number)
      })
      // State should not be mutated - server handles it
      expect(gameState.teams).toHaveLength(0)
    })

    it('should return update-team-command', () => {
      gameState.nodeMode = 'admin'
      gameState.teams = [{ id: 1, name: 'Red Team', color: '#ff0000', score: 0 }]
      
      const command = gameState.updateTeam(1, { name: 'Blue Team' })
      
      expect(command).toEqual({
        type: 'update-team-command',
        teamId: 1,
        updates: { name: 'Blue Team' },
        timestamp: expect.any(Number)
      })
      // State should not be mutated
      expect(gameState.teams[0].name).toBe('Red Team')
    })

    it('should return remove-team-command', () => {
      gameState.nodeMode = 'admin'
      gameState.teams = [{ id: 1, name: 'Red', color: '#ff0000', score: 0 }, { id: 2, name: 'Blue', color: '#0000ff', score: 0 }]
      
      const command = gameState.removeTeam(1)
      
      expect(command).toEqual({
        type: 'remove-team-command',
        teamId: 1,
        timestamp: expect.any(Number)
      })
      // State should not be mutated
      expect(gameState.teams).toHaveLength(2)
    })
  })

  describe('Node Management', () => {
    it('should update local node cache when adding', () => {
      gameState.nodeMode = 'admin'
      gameState.nodes = [{ id: 'Alpha', mode: 'capture-point', status: 'offline', lastSeen: 0 }]
      
      const result = gameState.addNode('Alpha')
      
      expect(result).toBe('Alpha')
      expect(gameState.nodes[0].status).toBe('online')
      expect(gameState.nodes[0].lastSeen).toBeGreaterThan(0)
    })

    it('should update local node cache when removing', () => {
      gameState.nodeMode = 'admin'
      gameState.nodes = [{ id: 'Alpha', mode: 'capture-point', status: 'online', lastSeen: Date.now() }]
      
      gameState.removeNode('Alpha')
      
      // Node status should be updated to offline (server manages actual removal)
      expect(gameState.nodes[0].status).toBe('offline')
    })

    it('should return position update command for admin', () => {
      gameState.nodeMode = 'admin'
      const command = gameState.updateNodePosition('Alpha', { lat: 37.7749, lon: -122.4194 })
      
      expect(command).toEqual({
        type: 'update-position-command',
        natoName: 'Alpha',
        position: { lat: 37.7749, lon: -122.4194 },
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Game Control', () => {
    it('should return start-game-command', () => {
      gameState.nodeMode = 'admin'
      const command = gameState.startGame()
      
      expect(command).toEqual({
        type: 'start-game-command',
        timestamp: expect.any(Number)
      })
      // State should not be mutated - server handles it
      expect(gameState.gameActive).toBe(false)
    })

    it('should return stop-game-command', () => {
      gameState.nodeMode = 'admin'
      gameState.gameActive = true
      const command = gameState.stopGame()
      
      expect(command).toEqual({
        type: 'stop-game-command',
        timestamp: expect.any(Number)
      })
      // State should not be mutated
      expect(gameState.gameActive).toBe(true)
    })

    it('should return reset-game-command', () => {
      gameState.nodeMode = 'admin'
      gameState.teams = [{ id: 1, name: 'Red', color: '#ff0000', score: 100 }]
      
      const command = gameState.resetGame()
      
      expect(command).toEqual({
        type: 'reset-game-command',
        timestamp: expect.any(Number)
      })
      // State should not be mutated
      expect(gameState.teams[0].score).toBe(100)
    })
  })
})
