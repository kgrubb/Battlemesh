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
    it('should create add-team command', () => {
      gameState.nodeMode = 'admin'
      const command = gameState.addTeam('Red Team', '#ff0000')
      expect(command).toEqual({
        type: 'add-team-command',
        name: 'Red Team',
        color: '#ff0000',
        timestamp: expect.any(Number)
      })
    })

    it('should create remove-team command', () => {
      gameState.nodeMode = 'admin'
      gameState.teams = [{ id: 1, name: 'Red', color: '#ff0000', score: 0 }, { id: 2, name: 'Blue', color: '#0000ff', score: 0 }]
      const command = gameState.removeTeam(1)
      expect(command).toEqual({ type: 'remove-team-command', teamId: 1, timestamp: expect.any(Number) })
    })

    it('should allow invalid team names client-side (server validates)', () => {
      gameState.nodeMode = 'admin'
      expect(() => gameState.addTeam('', '#ff0000')).not.toThrow()
    })

    it('should allow invalid team colors client-side (server validates)', () => {
      gameState.nodeMode = 'admin'
      expect(() => gameState.addTeam('Red Team', 'invalid')).not.toThrow()
    })
  })

  describe('Capture Point Management', () => {
    it('should update local cache when adding node', () => {
      gameState.nodeMode = 'admin'
      gameState.nodes = [{ id: 'Alpha', mode: 'capture-point', status: 'offline', lastSeen: 0 }]
      const result = gameState.addNode('Alpha', 'capture-point')
      expect(result).toBe('Alpha')
      expect(gameState.nodes[0].status).toBe('online')
    })

    it('should create capture-event command', () => {
      gameState.localNodeName = 'Alpha'
      const cmd = gameState.captureForTeam(1)
      expect(cmd).toEqual({ type: 'capture-event', natoName: 'Alpha', teamId: 1, timestamp: expect.any(Number) })
    })

    it('should create update-position command for admin', () => {
      gameState.nodeMode = 'admin'
      const cmd = gameState.updateNodePosition('Alpha', { lat: 37.7749, lon: -122.4194 })
      expect(cmd).toEqual({
        type: 'update-position-command',
        natoName: 'Alpha',
        position: { lat: 37.7749, lon: -122.4194 },
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Game Control', () => {
    it('should return start/stop/reset commands', () => {
      gameState.nodeMode = 'admin'
      const startCmd = gameState.startGame()
      expect(startCmd).toEqual({ type: 'start-game-command', timestamp: expect.any(Number) })
      const stopCmd = gameState.stopGame()
      expect(stopCmd).toEqual({ type: 'stop-game-command', timestamp: expect.any(Number) })
      const resetCmd = gameState.resetGame()
      expect(resetCmd).toEqual({ type: 'reset-game-command', timestamp: expect.any(Number) })
    })
  })

  describe('Getters', () => {
    it('should identify admin mode', () => {
      gameState.nodeMode = 'admin'
      expect(gameState.isAdmin).toBe(true)
      
      gameState.nodeMode = 'capture-point'
      expect(gameState.isAdmin).toBe(false)
    })

    it('should find local capture point (when server syncs state)', () => {
      gameState.nodeMode = 'admin'
      gameState.localNodeName = 'Alpha'
      // Simulate server sync that includes capture point
      gameState.capturePoints = [{ id: 'Alpha' }]
      const localCP = gameState.localCapturePoint
      expect(localCP).toBeTruthy()
      expect(localCP.id).toBe('Alpha')
    })

    it('should filter online nodes', () => {
      gameState.nodeMode = 'admin'
      // Simulate server state for nodes
      gameState.nodes = [
        { id: 'Alpha', mode: 'capture-point', status: 'online' },
        { id: 'Bravo', mode: 'capture-point', status: 'offline' }
      ]
      const onlineNodes = gameState.onlineNodes
      expect(onlineNodes).toHaveLength(1)
      expect(onlineNodes[0].id).toBe('Alpha')
    })
  })
})