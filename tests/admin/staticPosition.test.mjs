import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('Static Position Functions', () => {
  let gameState

  beforeEach(() => {
    setActivePinia(createPinia())
    gameState = useGameState()
    gameState.nodeMode = 'admin'
    gameState.initializeGame()
  })

  describe('setStaticPosition', () => {
    it('should set static position for a node', () => {
      gameState.addNode('Alpha', 'capture-point')
      
      const position = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition('Alpha', position)
      
      const cp = gameState.capturePoints.find(cp => cp.id === 'Alpha')
      expect(cp.staticPosition).toEqual(position)
    })

    it('should validate GPS coordinates', () => {
      gameState.addNode('Alpha', 'capture-point')
      
      expect(() => gameState.setStaticPosition('Alpha', { lat: 200, lon: -122.4194 })).toThrow('Latitude')
    })
  })

  describe('togglePositionSource', () => {
    it('should toggle between GPS and static position', () => {
      gameState.addNode('Alpha', 'capture-point')
      
      // First set a static position (required for toggle to work)
      const position = { lat: 37.7749, lon: -122.4194 }
      gameState.setStaticPosition('Alpha', position)
      
      expect(gameState.capturePoints[0].useStaticPosition).toBe(false)
      
      gameState.togglePositionSource('Alpha')
      expect(gameState.capturePoints[0].useStaticPosition).toBe(true)
      
      gameState.togglePositionSource('Alpha')
      expect(gameState.capturePoints[0].useStaticPosition).toBe(false)
    })
  })
})