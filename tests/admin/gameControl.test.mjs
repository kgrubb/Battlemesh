import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('Game Control Functions', () => {
  let gameState

  beforeEach(() => {
    setActivePinia(createPinia())
    gameState = useGameState()
    gameState.nodeMode = 'admin'
  })

  describe('Game Initialization', () => {
    it('should initialize game with default teams', () => {
      gameState.initializeGame()
      
      expect(gameState.teams).toHaveLength(2)
      expect(gameState.teams[0].id).toBe(1)
      expect(gameState.teams[1].id).toBe(2)
      expect(gameState.gameActive).toBe(false)
    })
  })

  describe('Game Control', () => {
    it('should return start-game-command', () => {
      gameState.initializeGame()
      const command = gameState.startGame()
      
      expect(command).toEqual({
        type: 'start-game-command',
        timestamp: expect.any(Number)
      })
      // State should not be mutated - server handles it
      expect(gameState.gameActive).toBe(false)
    })

    it('should return stop-game-command', () => {
      gameState.initializeGame()
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
      gameState.initializeGame()
      gameState.gameActive = true
      gameState.teams[0].score = 100
      const command = gameState.resetGame()
      
      expect(command).toEqual({
        type: 'reset-game-command',
        timestamp: expect.any(Number)
      })
      // State should not be mutated - server handles it
      expect(gameState.teams[0].score).toBe(100)
    })
  })
})