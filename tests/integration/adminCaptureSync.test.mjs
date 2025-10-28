import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import * as stateManager from '../../server/utils/gameStateManager.mjs'
import { getNextAvailableNatoName, resetNameIndex } from '../../server/utils/nodeNames.mjs'

describe('Admin-Capture Point Synchronization', () => {
  let server
  let wss
  let adminWs
  let captureWs1
  let captureWs2
  
  beforeEach(async () => {
    // Reset state for each test
    await stateManager.clearState()
    await stateManager.initialize()
    resetNameIndex()
    
    // Create test server
    server = createServer()
    wss = new WebSocketServer({ server })
    
    // Mock WebSocket handler logic
    const peers = new Map()
    let adminPeer = null
    
    wss.on('connection', (ws) => {
      const peerId = Math.random().toString(36).substring(7)
      peers.set(peerId, { peer: ws, natoName: null, mode: null, lastSeen: Date.now() })
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          const peerData = peers.get(peerId)
          
          if (message.type === 'register') {
            peerData.mode = message.mode
            
            if (message.mode === 'admin') {
              peerData.natoName = 'HQ Command'
              adminPeer = ws
              
              // Send server state
              const serverState = stateManager.getState()
              ws.send(JSON.stringify({
                type: 'server-state',
                state: {
                  teams: serverState.teams,
                  capturePoints: serverState.capturePoints,
                  gameActive: serverState.gameActive,
                  gameStartTime: serverState.gameStartTime,
                  activityFeed: serverState.activityFeed
                },
                timestamp: Date.now()
              }))
              
              // Send node-joined events for existing nodes
              setTimeout(() => {
                for (const [, pData] of peers) {
                  if (pData.natoName && pData.mode && pData.mode !== 'admin') {
                    ws.send(JSON.stringify({
                      type: 'node-joined',
                      natoName: pData.natoName,
                      mode: pData.mode,
                      timestamp: Date.now()
                    }))
                  }
                }
              }, 10)
            } else {
              // Capture point registration
              if (message.natoName) {
                peerData.natoName = message.natoName
                stateManager.updateNatoNameLastSeen(message.natoName)
                
                // Notify admin
                if (adminPeer && adminPeer !== ws) {
                  adminPeer.send(JSON.stringify({
                    type: 'node-joined',
                    natoName: message.natoName,
                    mode: message.mode,
                    timestamp: Date.now()
                  }))
                }
              } else {
                // Assign NATO name
                const assignedNatoName = getNextAvailableNatoName()
                peerData.natoName = assignedNatoName
                stateManager.assignNatoName(assignedNatoName)
                
                // Send assignment to client
                ws.send(JSON.stringify({
                  type: 'nato-name-assigned',
                  natoName: assignedNatoName,
                  timestamp: Date.now()
                }))
              }
            }
          }
        } catch (err) {
          console.error('Error processing message:', err)
        }
      })
      
      ws.on('close', () => {
        const peerData = peers.get(peerId)
        if (peerData && peerData.natoName && peerData.mode === 'capture-point') {
          stateManager.releaseNatoName(peerData.natoName)
        }
        peers.delete(peerId)
        if (ws === adminPeer) {
          adminPeer = null
        }
      })
    })
    
    server.listen(0)
  })
  
  afterEach(() => {
    if (adminWs) adminWs.close()
    if (captureWs1) captureWs1.close()
    if (captureWs2) captureWs2.close()
    if (wss) wss.close()
    if (server) server.close()
  })
  
  it('should synchronize capture points between admin and capture point tabs', async () => {
    const port = server.address().port
    
    // Connect capture point 1
    captureWs1 = new WebSocket(`ws://localhost:${port}`)
    await new Promise(resolve => captureWs1.on('open', resolve))
    
    // Register capture point 1 (should get NATO name assignment)
    captureWs1.send(JSON.stringify({
      type: 'register',
      mode: 'capture-point',
      timestamp: Date.now()
    }))
    
    // Wait for NATO name assignment
    const assignment1 = await new Promise(resolve => {
      captureWs1.on('message', (data) => {
        const message = JSON.parse(data.toString())
        if (message.type === 'nato-name-assigned') {
          resolve(message.natoName)
        }
      })
    })
    
    // Re-register with assigned name
    captureWs1.send(JSON.stringify({
      type: 'register',
      natoName: assignment1,
      mode: 'capture-point',
      timestamp: Date.now()
    }))
    
    // Connect capture point 2
    captureWs2 = new WebSocket(`ws://localhost:${port}`)
    await new Promise(resolve => captureWs2.on('open', resolve))
    
    // Register capture point 2
    captureWs2.send(JSON.stringify({
      type: 'register',
      mode: 'capture-point',
      timestamp: Date.now()
    }))
    
    const assignment2 = await new Promise(resolve => {
      captureWs2.on('message', (data) => {
        const message = JSON.parse(data.toString())
        if (message.type === 'nato-name-assigned') {
          resolve(message.natoName)
        }
      })
    })
    
    captureWs2.send(JSON.stringify({
      type: 'register',
      natoName: assignment2,
      mode: 'capture-point',
      timestamp: Date.now()
    }))
    
    // Connect admin panel
    adminWs = new WebSocket(`ws://localhost:${port}`)
    await new Promise(resolve => adminWs.on('open', resolve))
    
    // Register admin
    adminWs.send(JSON.stringify({
      type: 'register',
      mode: 'admin',
      timestamp: Date.now()
    }))
    
    // Collect all messages admin receives
    const adminMessages = []
    adminWs.on('message', (data) => {
      const message = JSON.parse(data.toString())
      adminMessages.push(message)
    })
    
    // Wait for admin to receive server state and node-joined events
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Verify admin received server state with capture points
    const serverStateMessage = adminMessages.find(m => m.type === 'server-state')
    expect(serverStateMessage).toBeDefined()
    expect(serverStateMessage.state.capturePoints).toHaveLength(2)
    
    const cpIds = serverStateMessage.state.capturePoints.map(cp => cp.id)
    expect(cpIds).toContain(assignment1)
    expect(cpIds).toContain(assignment2)
    
    // Verify admin received node-joined events
    const nodeJoinedMessages = adminMessages.filter(m => m.type === 'node-joined')
    expect(nodeJoinedMessages).toHaveLength(2)
    
    const joinedNodeIds = nodeJoinedMessages.map(m => m.natoName)
    expect(joinedNodeIds).toContain(assignment1)
    expect(joinedNodeIds).toContain(assignment2)
    
    // Verify server state has correct capture points
    const serverState = stateManager.getState()
    expect(serverState.capturePoints).toHaveLength(2)
    expect(serverState.capturePoints.map(cp => cp.id)).toEqual(expect.arrayContaining([assignment1, assignment2]))
  })
  
  it('should handle capture point disconnection correctly', async () => {
    const port = server.address().port
    
    // Connect and register capture point
    captureWs1 = new WebSocket(`ws://localhost:${port}`)
    await new Promise(resolve => captureWs1.on('open', resolve))
    
    captureWs1.send(JSON.stringify({
      type: 'register',
      mode: 'capture-point',
      timestamp: Date.now()
    }))
    
    const assignment = await new Promise(resolve => {
      captureWs1.on('message', (data) => {
        const message = JSON.parse(data.toString())
        if (message.type === 'nato-name-assigned') {
          resolve(message.natoName)
        }
      })
    })
    
    captureWs1.send(JSON.stringify({
      type: 'register',
      natoName: assignment,
      mode: 'capture-point',
      timestamp: Date.now()
    }))
    
    // Verify capture point was created
    let serverState = stateManager.getState()
    expect(serverState.capturePoints).toHaveLength(1)
    expect(serverState.capturePoints[0].id).toBe(assignment)
    
    // Disconnect capture point
    captureWs1.close()
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Verify capture point was removed
    serverState = stateManager.getState()
    expect(serverState.capturePoints).toHaveLength(0)
  })
})
