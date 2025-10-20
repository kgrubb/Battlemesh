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
})
