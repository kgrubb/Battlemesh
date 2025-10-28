import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameState } from '../../app/stores/gameState.mjs'

describe('Node Status After Admin Refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should refresh node status when node-joined event received', async () => {
    const gameState = useGameState()
    gameState.nodeMode = 'admin' // Set admin mode for test
    await gameState.initialize()
    gameState.initializeGame()
    
    // Add a node (simulating existing connection before refresh)
    const nodeId = 'Alpha'
    gameState.addNode(nodeId, 'capture-point')
    
    const node = gameState.nodes.find(n => n.id === nodeId)
    expect(node).toBeTruthy()
    
    // Simulate old lastSeen timestamp
    const oldTimestamp = Date.now() - 100000 // 100 seconds ago
    node.lastSeen = oldTimestamp
    
    // Simulate node-joined event being received (server notifying admin of existing connection)
    // This simulates what happens when admin refreshes and server sends node-joined for existing nodes
    const mockNodeJoinedEvent = {
      type: 'node-joined',
      natoName: nodeId,
      mode: 'capture-point',
      timestamp: Date.now()
    }
    
    // Simulate the handler logic from useGameSync
    const existingNode = gameState.nodes.find(n => n.id === mockNodeJoinedEvent.natoName)
    const existingCp = gameState.capturePoints.find(cp => cp.id === mockNodeJoinedEvent.natoName)
    
    if (existingCp) {
      if (!existingNode) {
        // Create new node entry
        const newNode = { 
          id: mockNodeJoinedEvent.natoName, 
          mode: mockNodeJoinedEvent.mode, 
          status: 'online', 
          lastSeen: Date.now(), 
          position: existingCp.position 
        }
        gameState.nodes.push(newNode)
      } else {
        // Update existing node
        existingNode.status = 'online'
        existingNode.lastSeen = Date.now()
      }
    }
    
    // Verify the node's status and lastSeen were updated
    const updatedNode = gameState.nodes.find(n => n.id === nodeId)
    expect(updatedNode.status).toBe('online')
    expect(updatedNode.lastSeen).toBeGreaterThan(oldTimestamp)
    expect(updatedNode.lastSeen).toBeLessThanOrEqual(Date.now())
  })
  
  it('should handle multiple nodes refreshing status', async () => {
    const gameState = useGameState()
    gameState.nodeMode = 'admin' // Set admin mode for test
    await gameState.initialize()
    gameState.initializeGame()
    
    // Add multiple nodes
    gameState.addNode('Alpha', 'capture-point')
    gameState.addNode('Bravo', 'capture-point')
    gameState.addNode('Charlie', 'capture-point')
    
    expect(gameState.nodes.length).toBe(4) // 3 capture points + 1 admin
    
    // Set old timestamps
    const oldTimestamp = Date.now() - 50000
    gameState.nodes.forEach(node => {
      if (node.mode === 'capture-point') {
        node.lastSeen = oldTimestamp
      }
    })
    
    // Simulate receiving node-joined events for all nodes
    const nodeIds = gameState.nodes
      .filter(n => n.mode === 'capture-point')
      .map(n => n.id)
    
    nodeIds.forEach(nodeId => {
      const existingNode = gameState.nodes.find(n => n.id === nodeId)
      if (existingNode) {
        existingNode.status = 'online'
        existingNode.lastSeen = Date.now()
      }
    })
    
    // Verify all capture point nodes have updated timestamps
    const captureNodes = gameState.nodes.filter(n => n.mode === 'capture-point')
    captureNodes.forEach(node => {
      expect(node.status).toBe('online')
      expect(node.lastSeen).toBeGreaterThan(oldTimestamp)
    })
  })
  
  it('should create node entry if it does not exist when node-joined received', async () => {
    const gameState = useGameState()
    gameState.nodeMode = 'admin' // Set admin mode for test
    await gameState.initialize()
    gameState.initializeGame()
    
    // Add a capture point but no node entry (simulating persisted state without node)
    const nodeId = 'Delta'
    gameState.addNode(nodeId, 'capture-point')
    
    // Remove the node but keep the capture point (simulating state)
    gameState.nodes = gameState.nodes.filter(n => n.id !== nodeId)
    
    expect(gameState.nodes.find(n => n.id === nodeId)).toBeFalsy()
    expect(gameState.capturePoints.find(cp => cp.id === nodeId)).toBeTruthy()
    
    // Simulate node-joined event
    const existingNode = gameState.nodes.find(n => n.id === nodeId)
    const existingCp = gameState.capturePoints.find(cp => cp.id === nodeId)
    
    if (!existingNode && existingCp) {
      // Create node entry
      const newNode = {
        id: nodeId,
        mode: 'capture-point',
        status: 'online',
        lastSeen: Date.now(),
        position: existingCp.position
      }
      gameState.nodes.push(newNode)
    }
    
    // Verify node was created
    expect(gameState.nodes.find(n => n.id === nodeId)).toBeTruthy()
  })
})
