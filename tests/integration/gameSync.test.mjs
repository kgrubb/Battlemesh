import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('useGameSync Integration Tests', () => {
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

  describe('Game State Management', () => {
    it('should handle node mode switching', () => {
      expect(gameState.nodeMode).toBe('capture-point')
      
      gameState.nodeMode = 'admin'
      expect(gameState.nodeMode).toBe('admin')
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

  describe('Capture Point Management', () => {
    it('should create capture points for nodes', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      
      expect(gameState.nodes).toHaveLength(1)
      expect(gameState.nodes[0].id).toBe('Alpha')
      expect(gameState.nodes[0].mode).toBe('capture-point')
    })

    it('should handle capture events', () => {
      gameState.nodeMode = 'admin'
      gameState.teams = [
        { id: 1, name: 'Red Team', color: '#ef4444', score: 0 }
      ]
      
      gameState.addNode('Alpha', 'capture-point')
      gameState.handleCaptureEvent('Alpha', 1)
      
      const capturePoint = gameState.capturePoints.find(cp => cp.id === 'Alpha')
      expect(capturePoint).toBeTruthy()
      expect(capturePoint.teamId).toBe(1)
    })

    it('should handle position updates', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      
      const position = { lat: 37.7749, lon: -122.4194 }
      gameState.updateNodePosition('Alpha', position)
      
      const node = gameState.nodes.find(n => n.id === 'Alpha')
      expect(node.position).toEqual(position)
    })
  })

  describe('State Synchronization', () => {
    it('should sync from server state', () => {
      gameState.nodeMode = 'admin'
      
      const serverState = {
        teams: [{ id: 1, name: 'Red Team', color: '#ef4444', score: 0 }],
        capturePoints: [{ id: 'Alpha', teamId: null, position: null }],
        gameActive: true,
        gameStartTime: Date.now()
      }
      
      gameState.syncFromServer(serverState)
      
      expect(gameState.teams).toEqual(serverState.teams)
      expect(gameState.capturePoints).toEqual(serverState.capturePoints)
      expect(gameState.gameActive).toBe(true)
    })

    it('should sync from admin state', () => {
      gameState.nodeMode = 'capture-point'
      
      const adminState = {
        teams: [{ id: 1, name: 'Red Team', color: '#ef4444', score: 0 }],
        capturePoints: [{ id: 'Alpha', teamId: 1, position: { lat: 37.7749, lon: -122.4194 } }],
        isActive: true,
        startTime: Date.now()
      }
      
      gameState.syncFromAdmin(adminState)
      
      expect(gameState.teams).toEqual(adminState.teams)
      expect(gameState.capturePoints).toEqual(adminState.capturePoints)
      expect(gameState.gameActive).toBe(true)
    })
  })

  describe('NATO Name Management', () => {
    it('should store and retrieve NATO names', () => {
      gameState.updateNatoName('Alpha')
      expect(gameState.localNodeName).toBe('Alpha')
      
      const stored = gameState.getStoredNatoName()
      expect(stored).toBe('Alpha')
    })

    it('should clear NATO names', () => {
      gameState.updateNatoName('Alpha')
      expect(gameState.localNodeName).toBe('Alpha')
      
      gameState.clearNatoName()
      expect(gameState.localNodeName).toBeNull()
    })

    it('should handle null NATO names', () => {
      const stored = gameState.getStoredNatoName()
      expect(stored).toBeNull()
    })
  })

  describe('Game Control', () => {
    it('should start and stop games', () => {
      gameState.nodeMode = 'admin'
      gameState.teams = [
        { id: 1, name: 'Red Team', color: '#ef4444', score: 0 }
      ]
      
      gameState.startGame()
      expect(gameState.gameActive).toBe(true)
      expect(gameState.gameStartTime).toBeTruthy()
      
      gameState.stopGame()
      expect(gameState.gameActive).toBe(false)
      expect(gameState.gameStartTime).toBeNull()
    })

    it('should reset games', () => {
      gameState.nodeMode = 'admin'
      gameState.teams = [
        { id: 1, name: 'Red Team', color: '#ef4444', score: 100 }
      ]
      gameState.capturePoints = [
        { id: 'Alpha', teamId: 1, position: null }
      ]
      
      gameState.resetGame()
      
      expect(gameState.teams[0].score).toBe(0)
      expect(gameState.capturePoints[0].teamId).toBeNull()
      expect(gameState.gameActive).toBe(false)
    })
  })

  describe('Team Management', () => {
    it('should add teams', () => {
      gameState.nodeMode = 'admin'
      
      const team = gameState.addTeam('Red Team', '#ef4444')
      
      expect(team.id).toBeTruthy()
      expect(team.name).toBe('Red Team')
      expect(team.color).toBe('#ef4444')
      expect(team.score).toBe(0)
      expect(gameState.teams).toHaveLength(1)
    })

    it('should remove teams', () => {
      gameState.nodeMode = 'admin'
      
      const team = gameState.addTeam('Red Team', '#ef4444')
      gameState.removeTeam(team.id)
      
      expect(gameState.teams).toHaveLength(0)
    })

    it('should validate team names', () => {
      gameState.nodeMode = 'admin'
      
      expect(() => {
        gameState.addTeam('', '#ef4444')
      }).toThrow()
      
      expect(() => {
        gameState.addTeam('Valid Team', '#ef4444')
      }).not.toThrow()
    })

    it('should validate team colors', () => {
      gameState.nodeMode = 'admin'
      
      expect(() => {
        gameState.addTeam('Red Team', 'invalid-color')
      }).toThrow()
      
      expect(() => {
        gameState.addTeam('Red Team', '#ef4444')
      }).not.toThrow()
    })
  })

  describe('Position Management', () => {
    it('should handle static positions', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      
      const position = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition('Alpha', position)
      
      const cp = gameState.capturePoints.find(cp => cp.id === 'Alpha')
      expect(cp.staticPosition).toEqual(position)
    })

    it('should toggle position sources', () => {
      gameState.nodeMode = 'admin'
      gameState.addNode('Alpha', 'capture-point')
      
      const staticPos = { lat: 37.7749, lon: -122.4194 }
      const gpsPos = { lat: 37.7750, lon: -122.4195 }
      
      gameState.setStaticPosition('Alpha', staticPos)
      gameState.updateNodePosition('Alpha', gpsPos)
      
      const cp = gameState.capturePoints.find(cp => cp.id === 'Alpha')
      expect(cp.staticPosition).toEqual(staticPos)
      expect(cp.position).toEqual(gpsPos)
      
      gameState.togglePositionSource('Alpha')
      expect(cp.useStaticPosition).toBe(true)
    })

    it('should validate GPS coordinates', () => {
      gameState.nodeMode = 'admin'
      
      expect(() => {
        gameState.setStaticPosition('Alpha', { lat: 91, lon: 0 })
      }).toThrow()
      
      expect(() => {
        gameState.setStaticPosition('Alpha', { lat: 37.7749, lon: -122.4194 })
      }).not.toThrow()
    })
  })

  describe('Node Management', () => {
    it('should handle node connections', () => {
      gameState.nodeMode = 'admin'
      
      gameState.addNode('Alpha', 'capture-point')
      expect(gameState.nodes).toHaveLength(1)
      
      gameState.handleNodeDisconnect('Alpha')
      const node = gameState.nodes.find(n => n.id === 'Alpha')
      expect(node.status).toBe('offline')
    })

    it('should handle node removal', () => {
      gameState.nodeMode = 'admin'
      
      gameState.addNode('Alpha', 'capture-point')
      expect(gameState.nodes).toHaveLength(1)
      
      gameState.removeNode('Alpha')
      expect(gameState.nodes).toHaveLength(0)
      expect(gameState.capturePoints).toHaveLength(0)
    })
  })

  describe('Scoring System', () => {
    it('should calculate scores during active games', () => {
      gameState.nodeMode = 'admin'
      gameState.gameActive = true
      gameState.teams = [
        { id: 1, name: 'Red Team', color: '#ef4444', score: 0 }
      ]
      gameState.capturePoints = [
        { id: 'Alpha', teamId: 1, position: null }
      ]
      
      // Start scoring interval
      gameState.startScoringInterval()
      
      // Wait a bit for scoring
      setTimeout(() => {
        expect(gameState.teams[0].score).toBeGreaterThan(0)
        gameState.stopScoringInterval()
      }, 1100)
    })

    it('should award capture bonuses', () => {
      gameState.nodeMode = 'admin'
      gameState.teams = [
        { id: 1, name: 'Red Team', color: '#ef4444', score: 0 }
      ]
      
      gameState.addNode('Alpha', 'capture-point')
      gameState.handleCaptureEvent('Alpha', 1)
      
      expect(gameState.teams[0].score).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      gameState.nodeMode = 'admin'
      
      // Rapid state changes
      for (let i = 0; i < 100; i++) {
        gameState.addNode(`Node${i}`, 'capture-point')
        gameState.removeNode(`Node${i}`)
      }
      
      expect(gameState.nodes).toHaveLength(0)
    })

    it('should handle invalid operations gracefully', () => {
      gameState.nodeMode = 'capture-point'
      
      // Should not throw errors for admin-only operations
      expect(() => {
        gameState.addTeam('Test Team', '#ef4444')
      }).not.toThrow()
      
      expect(() => {
        gameState.startGame()
      }).not.toThrow()
    })

    it('should handle missing data gracefully', () => {
      gameState.nodeMode = 'admin'
      
      expect(() => {
        gameState.handleCaptureEvent('NonExistent', 1)
      }).not.toThrow()
      
      expect(() => {
        gameState.updateNodePosition('NonExistent', { lat: 37.7749, lon: -122.4194 })
      }).not.toThrow()
    })
  })
})
