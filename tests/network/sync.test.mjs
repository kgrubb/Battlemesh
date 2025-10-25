import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('Network Synchronization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  describe('State Merging', () => {
    it('should merge remote state from admin', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'capture-point' })
      
      const remoteState = {
        teams: [
          { id: 'red', name: 'Red Team', color: '#ef4444', score: 500 },
          { id: 'blue', name: 'Blue Team', color: '#3b82f6', score: 300 }
        ],
        capturePoints: [{
          id: `cp-${gameState.localNodeId}`,
          nodeId: gameState.localNodeId,
          teamId: 'red',
          lastCaptureTime: Date.now(),
          totalCaptures: 3
        }],
        isActive: true,
        startTime: Date.now()
      }
      
      gameState.syncFromAdmin(remoteState)
      
      expect(gameState.teams.length).toBe(2)
      expect(gameState.teams[0].score).toBe(500)
      expect(gameState.gameActive).toBe(true)
      expect(gameState.adminConnected).toBe(true)
    })
    
    it('should receive all capture points from admin', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'capture-point' })
      
      gameState.localNodeName = 'Bravo' // Simulate assigned NATO name
      
      gameState.capturePoints = [{
        id: 'Bravo',
        teamId: null,
        position: null,
        lastCaptureTime: null,
        totalCaptures: 0
      }]
      
      const remoteState = {
        teams: [],
        capturePoints: [
          {
            id: 'Bravo',
            teamId: 2,
            lastCaptureTime: Date.now(),
            totalCaptures: 5
          },
          {
            id: 'Charlie',
            teamId: 1,
            lastCaptureTime: Date.now(),
            totalCaptures: 2
          }
        ],
        nodes: [],
        isActive: false,
        startTime: null
      }
      
      gameState.syncFromAdmin(remoteState)
      
      // Should receive ALL capture points (for map display)
      expect(gameState.capturePoints.length).toBe(2)
      
      // Local capture point should be updated
      const localCp = gameState.capturePoints.find(cp => cp.id === gameState.localNodeName)
      expect(localCp.teamId).toBe(2)
      expect(localCp.totalCaptures).toBe(5)
      
      // Other nodes should also be present
      const otherCp = gameState.capturePoints.find(cp => cp.id === 'Charlie')
      expect(otherCp).toBeTruthy()
      expect(otherCp.teamId).toBe(1)
    })
  })
  
  describe('Network Mode Switching', () => {
    it('should switch network mode', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      
      expect(gameState.networkMode).toBe('wifi')
      
      gameState.switchNetworkMode('meshtastic')
      expect(gameState.networkMode).toBe('meshtastic')
    })
  })
  
  describe('Static Position Sync', () => {
    it('should sync static position data via getFullState', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Alpha'
      gameState.addNode(nodeId, 'capture-point')
      
      const staticPos = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition(nodeId, staticPos)
      gameState.togglePositionSource(nodeId)
      
      const state = gameState.getFullState()
      const cp = state.capturePoints.find(cp => cp.id === nodeId)
      
      expect(cp.staticPosition).toEqual(staticPos)
      expect(cp.useStaticPosition).toBe(true)
      expect(state.capturePoints.length).toBeGreaterThan(0)
    })
    
    it('should include static position in broadcast state', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Bravo'
      gameState.addNode(nodeId, 'capture-point')
      
      const staticPos = { lat: 40.7128, lon: -74.0060 }
      gameState.setStaticPosition(nodeId, staticPos)
      
      const state = gameState.getFullState()
      const cp = state.capturePoints.find(cp => cp.id === nodeId)
      
      expect(cp).toHaveProperty('staticPosition')
      expect(cp).toHaveProperty('useStaticPosition')
      expect(cp.staticPosition).toEqual(staticPos)
    })
    
    it('should handle capture points with static positions in state sync', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Charlie'
      gameState.addNode(nodeId, 'capture-point')
      
      const staticPos = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition(nodeId, staticPos)
      gameState.togglePositionSource(nodeId)
      
      // Simulate state sync
      const fullState = gameState.getFullState()
      gameState.syncFromServer(fullState)
      
      const cp = gameState.capturePoints.find(cp => cp.id === nodeId)
      expect(cp.staticPosition).toEqual(staticPos)
      expect(cp.useStaticPosition).toBe(true)
    })
    
    it('should maintain backward compatibility with nodes without static position', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId1 = 'Delta'
      const nodeId2 = 'Echo'
      
      gameState.addNode(nodeId1, 'capture-point')
      gameState.addNode(nodeId2, 'capture-point')
      
      // Only node1 has static position
      gameState.setStaticPosition(nodeId1, { lat: 37.7749, lon: -122.4194 })
      
      const state = gameState.getFullState()
      const cp1 = state.capturePoints.find(cp => cp.id === nodeId1)
      const cp2 = state.capturePoints.find(cp => cp.id === nodeId2)
      
      // Node1 should have static position
      expect(cp1.staticPosition).toBeTruthy()
      
      // Node2 should work normally without static position
      expect(cp2).toBeTruthy()
      expect(cp2.staticPosition).toBeNull()
      expect(cp2.useStaticPosition).toBe(false)
    })
  })
})
