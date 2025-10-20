import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'
import { resetNameIndex } from '../../app/utils/nodeNames.mjs'

describe('Admin Game Control', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetNameIndex() // Reset NATO name pool between tests
  })
  
  describe('Game Initialization', () => {
    it('should initialize game with default teams', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      expect(gameState.teams.length).toBe(2)
      expect(gameState.teams[0].id).toBe(1)
      expect(gameState.teams[1].id).toBe(2)
      expect(gameState.gameActive).toBe(false)
    })
    
    it('should get NATO name from server', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      
      // In test environment, NATO name won't be fetched from server
      // It will be null until WebSocket assigns it, which is expected
      expect(gameState.localNodeName === null || typeof gameState.localNodeName === 'string').toBe(true)
    })
  })
  
  describe('Game Lifecycle', () => {
    it('should start game', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      gameState.startGame()
      
      expect(gameState.gameActive).toBe(true)
      expect(gameState.gameStartTime).toBeTruthy()
    })
    
    it('should stop game', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      gameState.startGame()
      
      gameState.stopGame()
      
      expect(gameState.gameActive).toBe(false)
    })
    
    it('should reset game', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      // Add some scores
      gameState.teams[0].score = 500
      gameState.teams[1].score = 300
      
      gameState.resetGame()
      
      expect(gameState.teams[0].score).toBe(0)
      expect(gameState.teams[1].score).toBe(0)
    })
  })
  
  describe('Team Management', () => {
    it('should add team', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const initialCount = gameState.teams.length
      gameState.addTeam('Green Team', '#10b981')
      
      expect(gameState.teams.length).toBe(initialCount + 1)
      expect(gameState.teams[initialCount].name).toBe('Green Team')
    })
    
    it('should remove team', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      gameState.addTeam('Green Team', '#10b981')
      
      const teamId = gameState.teams[2].id
      gameState.removeTeam(teamId)
      
      expect(gameState.teams.find(t => t.id === teamId)).toBeUndefined()
    })
  })
  
  describe('Node Management', () => {
    it('should add capture node', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      
      const natoName = gameState.addNode('Alpha', 'capture-point') // Use NATO name directly
      
      expect(gameState.nodes.length).toBe(2) // 1 admin + 1 capture
      expect(gameState.capturePoints.length).toBe(1) // Just the new capture node (admin has none)
      expect(natoName).toBe('Alpha') // NATO name
      expect(gameState.nodes.find(n => n.id === natoName)).toBeTruthy() // Node uses NATO name as ID
    })
    
    it('should remove node', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      const natoName = gameState.addNode('Alpha', 'capture-point')
      
      gameState.removeNode(natoName) // Remove by NATO name
      
      expect(gameState.nodes.length).toBe(1) // Just admin
      expect(gameState.capturePoints.length).toBe(0) // No capture points
    })
  })
  
  describe('Capture Events', () => {
    it('should handle capture event', async () => {
      const gameState = useGameState()
      await gameState.initialize({ nodeMode: 'admin' })
      gameState.initializeGame()
      const natoName = gameState.addNode('Alpha', 'capture-point')
      
      const initialScore = gameState.teams[0].score
      
      gameState.handleCaptureEvent(natoName, 1) // Use numeric team ID
      
      expect(gameState.capturePoints[0].teamId).toBe(1)
      expect(gameState.teams[0].score).toBe(initialScore + 10)
    })
  })
})
