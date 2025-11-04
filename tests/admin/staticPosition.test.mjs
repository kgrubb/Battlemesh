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
    it('should return command to set static position for a node', () => {
      gameState.addNode('Alpha', 'capture-point')
      
      const position = { lat: 37.7749, lon: -122.4194 }
      const command = gameState.setStaticPosition('Alpha', position)
      
      expect(command).toEqual({
        type: 'set-static-position-command',
        natoName: 'Alpha',
        position,
        timestamp: expect.any(Number)
      })
      // Client state is not mutated; server applies and broadcasts back
      const cp = gameState.capturePoints.find(cp => cp.id === 'Alpha')
      expect(cp?.staticPosition).toBeUndefined()
    })
    
    it('should not throw for invalid GPS coordinates (server validates)', () => {
      gameState.addNode('Alpha', 'capture-point')
      
      expect(() => gameState.setStaticPosition('Alpha', { lat: 200, lon: -122.4194 })).not.toThrow()
    })
  })

  describe('togglePositionSource', () => {
    it('should return command to toggle between GPS and static position', () => {
      gameState.addNode('Alpha', 'capture-point')
      
      const command = gameState.togglePositionSource('Alpha')
      expect(command).toEqual({
        type: 'toggle-position-source-command',
        natoName: 'Alpha',
        timestamp: expect.any(Number)
      })
      // Client state is not mutated locally; server applies and broadcasts back
      expect(gameState.capturePoints[0]?.useStaticPosition).toBeUndefined()
    })
  })
})