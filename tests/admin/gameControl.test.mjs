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
    it('should start game', () => {
      gameState.initializeGame()
      gameState.startGame()
      
      expect(gameState.gameActive).toBe(true)
      expect(gameState.gameStartTime).toBeTruthy()
    })

    it('should stop game', () => {
      gameState.initializeGame()
      gameState.startGame()
      gameState.stopGame()
      
      expect(gameState.gameActive).toBe(false)
    })

    it('should reset game', () => {
      gameState.initializeGame()
      gameState.startGame()
      gameState.teams[0].score = 100
      gameState.resetGame()
      
      expect(gameState.gameActive).toBe(false)
      expect(gameState.teams[0].score).toBe(0)
    })
  })
})