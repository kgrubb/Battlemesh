import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('Static Position Management', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  describe('setStaticPosition', () => {
    it('should set static position for a node', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      // Add a node first
      const nodeId = 'Alpha'
      gameState.addNode(nodeId, 'capture-point')
      
      const position = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition(nodeId, position)
      
      const cp = gameState.capturePoints.find(cp => cp.id === nodeId)
      expect(cp).toBeTruthy()
      expect(cp.staticPosition).toEqual(position)
    })
    
    it('should validate GPS coordinates', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Alpha'
      gameState.addNode(nodeId, 'capture-point')
      
      // Invalid latitude
      expect(() => {
        gameState.setStaticPosition(nodeId, { lat: 100, lon: -122.4194 })
      }).toThrow()
      
      // Invalid longitude
      expect(() => {
        gameState.setStaticPosition(nodeId, { lat: 37.7749, lon: -200 })
      }).toThrow()
    })
    
    it('should create capture point if it does not exist', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Bravo'
      const position = { lat: 40.7128, lon: -74.0060 }
      gameState.setStaticPosition(nodeId, position)
      
      const cp = gameState.capturePoints.find(cp => cp.id === nodeId)
      expect(cp).toBeTruthy()
      expect(cp.staticPosition).toEqual(position)
    })
  })
  
  describe('togglePositionSource', () => {
    it('should toggle between GPS and static position', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Charlie'
      gameState.addNode(nodeId, 'capture-point')
      
      // Set static position
      const staticPos = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition(nodeId, staticPos)
      
      // Add GPS position
      const gpsPos = { lat: 40.7128, lon: -74.0060 }
      gameState.updateNodePosition(nodeId, gpsPos)
      
      const cp = gameState.capturePoints.find(cp => cp.id === nodeId)
      const node = gameState.nodes.find(n => n.id === nodeId)
      
      expect(cp.useStaticPosition).toBe(false)
      expect(node.position).toEqual(gpsPos)
      
      // Toggle to static
      gameState.togglePositionSource(nodeId)
      
      expect(cp.useStaticPosition).toBe(true)
      expect(cp.position).toEqual(staticPos)
      
      // Toggle back to GPS
      gameState.togglePositionSource(nodeId)
      
      expect(cp.useStaticPosition).toBe(false)
      expect(cp.position).toEqual(gpsPos)
    })
    
    it('should not toggle if static position is not set', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Delta'
      gameState.addNode(nodeId, 'capture-point')
      
      // Try to toggle without static position
      const cp = gameState.capturePoints.find(cp => cp.id === nodeId)
      const initialUseStatic = cp.useStaticPosition
      
      gameState.togglePositionSource(nodeId)
      
      // Should remain unchanged
      expect(cp.useStaticPosition).toBe(initialUseStatic)
    })
    
    it('should persist static position through state sync', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Echo'
      gameState.addNode(nodeId, 'capture-point')
      
      const staticPos = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition(nodeId, staticPos)
      gameState.togglePositionSource(nodeId)
      
      // Get full state (simulating server state)
      const state = gameState.getFullState()
      
      const cp = state.capturePoints.find(cp => cp.id === nodeId)
      expect(cp.staticPosition).toEqual(staticPos)
      expect(cp.useStaticPosition).toBe(true)
    })
  })
  
  describe('updateNodePosition with static position', () => {
    it('should not update position when using static position', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Foxtrot'
      gameState.addNode(nodeId, 'capture-point')
      
      const staticPos = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition(nodeId, staticPos)
      gameState.togglePositionSource(nodeId)
      
      const gpsPos = { lat: 40.7128, lon: -74.0060 }
      gameState.updateNodePosition(nodeId, gpsPos)
      
      const cp = gameState.capturePoints.find(cp => cp.id === nodeId)
      // Should still have static position
      expect(cp.position).toEqual(staticPos)
      expect(cp.useStaticPosition).toBe(true)
    })
    
    it('should update position when not using static position', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const nodeId = 'Golf'
      gameState.addNode(nodeId, 'capture-point')
      
      // Set static but don't use it
      const staticPos = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition(nodeId, staticPos)
      
      const gpsPos = { lat: 40.7128, lon: -74.0060 }
      gameState.updateNodePosition(nodeId, gpsPos)
      
      const cp = gameState.capturePoints.find(cp => cp.id === nodeId)
      // Should have GPS position
      expect(cp.position).toEqual(gpsPos)
      expect(cp.useStaticPosition).toBe(false)
    })
  })
})
