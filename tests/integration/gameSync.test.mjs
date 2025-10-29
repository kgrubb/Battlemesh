import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('GameState Store Tests', () => {
  let gameState

  beforeEach(() => {
    setActivePinia(createPinia())
    gameState = useGameState()
    
    // Reset game state
    gameState.nodeMode = 'capture-point'
    gameState.localNodeName = 'Alpha'
    gameState.networkMode = 'wifi'
    gameState.adminConnected = false
    gameState.teams = []
    gameState.capturePoints = []
    gameState.nodes = []
    gameState.gameActive = false
  })

  describe('State Management', () => {
    it('should handle node mode switching', () => {
      expect(gameState.nodeMode).toBe('capture-point')
      
      gameState.nodeMode = 'admin'
      expect(gameState.nodeMode).toBe('admin')
      expect(gameState.isAdmin).toBe(true)
    })

    it('should handle network mode switching', () => {
      expect(gameState.networkMode).toBe('wifi')
      
      gameState.networkMode = 'meshtastic'
      expect(gameState.networkMode).toBe('meshtastic')
    })

    it('should handle admin connection status', () => {
      expect(gameState.adminConnected).toBe(false)
      
      gameState.adminConnected = true
      expect(gameState.adminConnected).toBe(true)
    })
  })

  describe('Team Management', () => {
    it('should add teams', () => {
      gameState.nodeMode = 'admin'
      expect(gameState.teams).toHaveLength(0)
      
      gameState.addTeam('Red Team', '#ff0000')
      expect(gameState.teams).toHaveLength(1)
      expect(gameState.teams[0].name).toBe('Red Team')
      expect(gameState.teams[0].color).toBe('#ff0000')
    })

    it('should remove teams', () => {
      gameState.nodeMode = 'admin'
      gameState.addTeam('Red Team', '#ff0000')
      gameState.addTeam('Blue Team', '#0000ff')
      expect(gameState.teams).toHaveLength(2)
      
      gameState.removeTeam(1)
      expect(gameState.teams).toHaveLength(1)
      expect(gameState.teams[0].name).toBe('Blue Team')
    })

    it('should validate team names', () => {
      gameState.nodeMode = 'admin'
      expect(() => gameState.addTeam('', '#ff0000')).toThrow('Team name')
    })

    it('should validate team colors', () => {
      gameState.nodeMode = 'admin'
      expect(() => gameState.addTeam('Red Team', 'invalid')).toThrow('Color must be')
    })
  })

  describe('Capture Point Management', () => {
    it('should create capture points for nodes', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      
      expect(gameState.capturePoints).toHaveLength(1)
      expect(gameState.capturePoints[0].id).toBe('Alpha')
    })

    it('should handle capture events', () => {
      gameState.nodeMode = 'admin'
      gameState.addTeam('Red Team', '#ff0000')
      gameState.addNode('Alpha', 'capture-point')
      
      // Set local node name and capture point for the capture to work
      gameState.localNodeName = 'Alpha'
      gameState.captureForTeam(1)
      expect(gameState.capturePoints[0].teamId).toBe(1)
    })

    it('should handle position updates', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      
      gameState.updateNodePosition('Alpha', { lat: 37.7749, lon: -122.4194 })
      expect(gameState.nodes[0].position).toEqual({ lat: 37.7749, lon: -122.4194 })
    })
  })

  describe('Game Control', () => {
    it('should start and stop games', () => {
      gameState.nodeMode = 'admin'
      expect(gameState.gameActive).toBe(false)
      
      gameState.startGame()
      expect(gameState.gameActive).toBe(true)
      expect(gameState.gameStartTime).toBeTruthy()
      
      gameState.stopGame()
      expect(gameState.gameActive).toBe(false)
    })

    it('should reset games', () => {
      gameState.nodeMode = 'admin'
      gameState.addTeam('Red Team', '#ff0000')
      gameState.startGame()
      gameState.teams[0].score = 100
      
      gameState.resetGame()
      expect(gameState.gameActive).toBe(false)
      expect(gameState.teams[0].score).toBe(0)
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
      gameState.nodeMode = 'admin'
      gameState.localNodeName = 'Alpha'
      gameState.addNode('Alpha', 'capture-point')
      
      const localCP = gameState.localCapturePoint
      expect(localCP).toBeTruthy()
      expect(localCP.id).toBe('Alpha')
    })

    it('should filter online nodes', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      gameState.addNode('Bravo', 'capture-point')
      
      gameState.nodes[1].status = 'offline'
      
      const onlineNodes = gameState.onlineNodes
      expect(onlineNodes).toHaveLength(1)
      expect(onlineNodes[0].id).toBe('Alpha')
    })
  })
})