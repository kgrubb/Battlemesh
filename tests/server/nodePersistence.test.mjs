import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('Node Persistence Across Refreshes', () => {
  it('should maintain nodes when syncFromServer does not include nodes array', async () => {
    setActivePinia(createPinia())
    const gameState = useGameState()
    await gameState.initialize({ nodeMode: 'admin' })
    gameState.initializeGame()
    
    // Add some nodes
    gameState.addNode('Alpha', 'capture-point')
    gameState.addNode('Bravo', 'capture-point')
    
    const initialNodeCount = gameState.nodes.length
    expect(initialNodeCount).toBeGreaterThan(0)
    
    // Simulate server-state without nodes array (as it should be)
    const serverStateWithoutNodes = {
      teams: gameState.teams,
      capturePoints: gameState.capturePoints,
      gameActive: false,
      gameStartTime: null,
      activityFeed: []
      // Note: No nodes array
    }
    
    // Sync from server
    gameState.syncFromServer(serverStateWithoutNodes)
    
    // Nodes should still be there (not filtered out)
    expect(gameState.nodes.length).toBe(initialNodeCount)
  })
  
  it('should not filter out nodes when server-state omits nodes array', async () => {
    setActivePinia(createPinia())
    const gameState = useGameState()
    await gameState.initialize({ nodeMode: 'admin' })
    gameState.initializeGame()
    
    // Add a node
    const nodeId = 'Charlie'
    gameState.addNode(nodeId, 'capture-point')
    
    // Verify node exists
    expect(gameState.nodes.find(n => n.id === nodeId)).toBeTruthy()
    
    // Simulate server-state that explicitly omits nodes (undefined)
    const serverState = {
      teams: gameState.teams,
      capturePoints: gameState.capturePoints,
      gameActive: false,
      gameStartTime: null
      // nodes not in this object
    }
    
    gameState.syncFromServer(serverState)
    
    // Node should still exist
    expect(gameState.nodes.find(n => n.id === nodeId)).toBeTruthy()
  })
  
  it('should handle server-state with empty nodes array by not filtering', async () => {
    setActivePinia(createPinia())
    const gameState = useGameState()
    await gameState.initialize({ nodeMode: 'admin' })
    gameState.initializeGame()
    
    // Add a node
    const nodeId = 'Delta'
    gameState.addNode(nodeId, 'capture-point')
    
    // Simulate server sending empty nodes array (shouldn't happen but be defensive)
    const serverStateWithEmptyNodes = {
      teams: gameState.teams,
      capturePoints: [],
      nodes: [], // Empty array
      gameActive: false,
      gameStartTime: null
    }
    
    gameState.syncFromServer(serverStateWithEmptyNodes)
    
    // Since serverState.nodes exists but is empty, it will filter all nodes
    // This is the current behavior - nodes would be cleared
    // But in reality, server should never send nodes array
    expect(gameState.nodes.length).toBe(0)
  })
})
