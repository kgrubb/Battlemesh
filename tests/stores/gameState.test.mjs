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
    it('should add team successfully', () => {
      gameState.nodeMode = 'admin'
      gameState.addTeam('Red Team', '#ff0000')
      
      expect(gameState.teams).toHaveLength(1)
      expect(gameState.teams[0].name).toBe('Red Team')
      expect(gameState.teams[0].color).toBe('#ff0000')
    })

    it('should validate team name', () => {
      gameState.nodeMode = 'admin'
      expect(() => gameState.addTeam('', '#ff0000')).toThrow('Team name')
    })

    it('should validate team color', () => {
      gameState.nodeMode = 'admin'
      expect(() => gameState.addTeam('Red Team', 'invalid')).toThrow('Color must be')
    })

    it('should remove team', () => {
      gameState.nodeMode = 'admin'
      gameState.addTeam('Red Team', '#ff0000')
      gameState.addTeam('Blue Team', '#0000ff')
      
      gameState.removeTeam(1)
      
      expect(gameState.teams).toHaveLength(1)
      expect(gameState.teams[0].name).toBe('Blue Team')
    })
  })

  describe('Node Management', () => {
    it('should add node', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      
      expect(gameState.nodes).toHaveLength(1)
      expect(gameState.nodes[0].id).toBe('Alpha')
      expect(gameState.nodes[0].mode).toBe('capture-point')
    })

    it('should remove node', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      gameState.addNode('Bravo', 'capture-point')
      
      gameState.removeNode('Alpha')
      
      expect(gameState.nodes).toHaveLength(1)
      expect(gameState.nodes[0].id).toBe('Bravo')
    })

    it('should update node position', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      
      gameState.updateNodePosition('Alpha', { lat: 37.7749, lon: -122.4194 })
      
      expect(gameState.nodes[0].position).toEqual({ lat: 37.7749, lon: -122.4194 })
    })
  })

  describe('Game Control', () => {
    it('should start game', () => {
      gameState.nodeMode = 'admin'
      gameState.startGame()
      
      expect(gameState.gameActive).toBe(true)
      expect(gameState.gameStartTime).toBeTruthy()
    })

    it('should stop game', () => {
      gameState.nodeMode = 'admin'
      gameState.startGame()
      gameState.stopGame()
      
      expect(gameState.gameActive).toBe(false)
    })

    it('should reset game', () => {
      gameState.nodeMode = 'admin'
      gameState.addTeam('Red Team', '#ff0000')
      gameState.startGame()
      gameState.teams[0].score = 100
      
      gameState.resetGame()
      
      expect(gameState.gameActive).toBe(false)
      expect(gameState.teams[0].score).toBe(0)
    })
  })
})
