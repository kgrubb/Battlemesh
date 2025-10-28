import { defineWebSocketHandler } from 'h3'
import * as stateManager from '../utils/gameStateManager.mjs'
import { getNextAvailableNatoName, markNatoNameAsUsed } from '../utils/nodeNames.mjs'

const peers = new Map() // peerId -> { peer, natoName, mode, lastSeen }
let adminPeer = null

// Initialize state manager on startup
stateManager.initialize().then(() => {
  console.log('[WebSocket] Server state initialized')
  
  // Reset state manager to ensure clean slate on every server start
  stateManager.resetStateManager()
  
  // Capture points and NATO names are now ephemeral - no need to synchronize from persisted state
  console.log('[WebSocket] Starting with clean slate - capture points will be created as nodes connect')
})

export default defineWebSocketHandler({
  open(peer) {
    console.log('[WebSocket] New connection:', peer.id)
    
    peers.set(peer.id, {
      peer,
      natoName: null,
      mode: null,
      lastSeen: Date.now()
    })
    
    // Send welcome message
    peer.send(JSON.stringify({
      type: 'connected',
      peerId: peer.id,
      timestamp: Date.now()
    }))
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      const peerData = peers.get(peer.id)
      
      if (!peerData) {
        console.log('[WebSocket] Received message from unknown peer:', peer.id)
        return
      }
      
      peerData.lastSeen = Date.now()
      
      // Only log important message types (not heartbeat/position updates)
      if (data.type !== 'heartbeat' && data.type !== 'position-update' && data.type !== 'state-update') {
        console.log('[WebSocket] Received:', data.type, 'from', peerData.natoName || peerData.mode || 'unknown')
      }
      
      // Handle different message types
      switch (data.type) {
        case 'register': {
          // Node registration - data.natoName can be null for first-time clients
          peerData.mode = data.mode
          
          if (data.mode === 'admin') {
            // Admin always uses hardcoded NATO name
            peerData.natoName = 'HQ Command'
            adminPeer = peer
            console.log('[WebSocket] ✓ Admin registered:', peerData.natoName)
            
            // Send current server state to admin
            const serverState = stateManager.getState()
            sendStateToClient(peer, 'server-state', serverState)
            
            // Send node-joined events for all currently connected nodes
            // This ensures admin knows about nodes that were already connected
            setTimeout(() => {
              for (const [, pData] of peers) {
                if (pData.natoName && pData.mode && pData.mode !== 'admin') {
                  console.log('[WebSocket] Sending node-joined to admin for:', pData.natoName)
                  peer.send(JSON.stringify({
                    type: 'node-joined',
                    natoName: pData.natoName,
                    mode: pData.mode,
                    timestamp: Date.now()
                  }))
                }
              }
            }, 100)
          } else {
            // Capture point registration
            if (data.natoName) {
              // Client has a NATO name (reconnection or existing client)
              peerData.natoName = data.natoName
              console.log('[WebSocket] ✓ Capture node registered:', peerData.natoName)
              
              // Update last seen time
              stateManager.updateNatoNameLastSeen(peerData.natoName)
              
              // Send current server state to this capture node (for reconnection)
              const serverState = stateManager.getState()
              sendStateToClient(peer, 'server-state', serverState)
              
              // Notify admin about this node
              if (adminPeer && adminPeer !== peer) {
                sendToAdmin({
                  type: 'node-joined',
                  natoName: peerData.natoName,
                  mode: data.mode,
                  timestamp: Date.now()
                })
              }
            } else {
              // Client needs NATO name assignment (first-time connection)
              console.log('[WebSocket] Capture node needs NATO name assignment')
              
              // Assign next available NATO name
              const assignedNatoName = getNextAvailableNatoName()
              peerData.natoName = assignedNatoName
              
              // Track assignment in state manager
              stateManager.assignNatoName(assignedNatoName)
              markNatoNameAsUsed(assignedNatoName)
              
              console.log('[WebSocket] ✓ Assigned NATO name:', assignedNatoName)
              
              // Send NATO name assignment to client
              peer.send(JSON.stringify({
                type: 'nato-name-assigned',
                natoName: assignedNatoName,
                timestamp: Date.now()
              }))
              
              // Note: Normal registration will happen after client receives nato-name-assigned
              // and sends a new register message with the assigned NATO name
            }
          }
          
          // Notify all OTHER peers about new node (only if NATO name is assigned)
          if (peerData.natoName) {
            broadcast({
              type: 'node-joined',
              natoName: peerData.natoName,
              mode: data.mode,
              timestamp: Date.now()
            }, peer.id)
          }
          break
        }
          
        case 'state-update':
          // Admin broadcasting state to all capture nodes
          if (peerData.mode === 'admin') {
            sendToCaptureNodes({
              type: 'state-sync',
              state: data.state,
              timestamp: Date.now()
            })
          }
          break
          
        case 'capture-event':
          // Capture node sending event to admin (with NATO name)
          if (adminPeer) {
            sendToAdmin({
              type: 'capture-event',
              natoName: data.natoName || peerData.natoName,
              teamId: data.teamId,
              timestamp: data.timestamp
            })
          } else {
            console.error('[WebSocket] ✗ No admin connected!')
          }
          break
          
        case 'position-update':
          // Node sending GPS position (use NATO name)
          if (adminPeer && peerData.mode !== 'admin') {
            sendToAdmin({
              type: 'position-update',
              natoName: data.natoName || peerData.natoName,
              position: data.position,
              timestamp: Date.now()
            })
          }
          break
          
        case 'heartbeat':
          // Heartbeat response
          peer.send(JSON.stringify({
            type: 'heartbeat-ack',
            timestamp: Date.now()
          }))
          break
          
        case 'server-state-request': {
          // Client requesting current server state
          const serverState = stateManager.getState()
          sendStateToClient(peer, 'server-state', serverState)
          break
        }
          
        case 'server-state-update': {
          // Admin updating server state (teams, game status, etc.)
          if (peerData.mode === 'admin' && data.updates) {
            // Don't overwrite nodes from admin (they're managed by WebSocket connections)
            const updates = { ...data.updates }
            delete updates.nodes // Nodes are ephemeral
            delete updates.capturePoints // Capture points are ephemeral
            delete updates.assignedNatoNames // NATO name assignments are ephemeral
            
            // Save immediately for important updates
            const immediate = updates.gameActive !== undefined || updates.teams !== undefined
            stateManager.updateState(updates, immediate)
          }
          break
        }
          
        case 'activity-event': {
          // Add activity to feed
          if (peerData.mode === 'admin') {
            const activity = stateManager.addActivity(data.activityType, data.message, data.teamId)
            
            // Broadcast to all clients
            broadcast({
              type: 'activity-added',
              activity,
              timestamp: Date.now()
            })
          }
          break
        }
          
        case 'clear-activity-feed': {
          // Clear activity feed
          if (peerData.mode === 'admin') {
            stateManager.clearActivityFeed()
            
            broadcast({
              type: 'activity-feed-cleared',
              timestamp: Date.now()
            })
          }
          break
        }
          
        case 'clear-server-state': {
          // Clear all state and file
          if (peerData.mode === 'admin') {
            stateManager.clearState().then(() => {
              const freshState = stateManager.getState()
              broadcast({
                type: 'server-state',
                state: createStateMessage('server-state', freshState).state,
                timestamp: Date.now()
              })
            })
          }
          break
        }
      }
    } catch (err) {
      console.error('[WebSocket] Error processing message:', err)
    }
  },

  close(peer) {
    console.log('[WebSocket] Connection closed:', peer.id)
    const peerData = peers.get(peer.id)
    
    if (peerData) {
      // Notify admin of node disconnect (use NATO name)
      if (peerData.mode === 'capture-point' && adminPeer && peerData.natoName) {
        sendToAdmin({
          type: 'node-disconnect',
          natoName: peerData.natoName,
          timestamp: Date.now()
        })
      }
      
      // Release NATO name from both tracking systems
      if (peerData.natoName && peerData.mode === 'capture-point') {
        stateManager.releaseNatoName(peerData.natoName)
        // Note: We don't remove from usedNames Set here because the name might be reused
        // The usedNames Set will be cleared on server restart anyway
        console.log('[WebSocket] Released NATO name:', peerData.natoName)
      }
      
      // Don't broadcast node-left on connection close - only mark as disconnected
      // node-left should only be sent when a node explicitly leaves (via message)
      // Connection close could be a page reload, network issue, etc.
      
      if (peer === adminPeer) {
        adminPeer = null
        console.log('[WebSocket] ✗ Admin disconnected - nodes may enter gossip mode')
      }
    }
    
    peers.delete(peer.id)
  },

  error(peer, error) {
    console.error('[WebSocket] Error:', error)
  }
})

// Helper functions
const createStateMessage = (type, state) => {
  console.log('[WebSocket] Creating state message with', state.capturePoints.length, 'capture points')
  return {
    type,
    state: {
      teams: state.teams,
      capturePoints: state.capturePoints,
      gameActive: state.gameActive,
      gameStartTime: state.gameStartTime,
      activityFeed: state.activityFeed
    },
    timestamp: Date.now()
  }
}

const sendStateToClient = (peer, type, state) => 
  peer.send(JSON.stringify(createStateMessage(type, state)))

const sendToAdmin = message => adminPeer?.send(JSON.stringify(message))

const sendToCaptureNodes = message => {
  const msg = JSON.stringify(message)
  for (const [, peerData] of peers) {
    if (peerData.mode === 'capture-point') {
      try {
        peerData.peer.send(msg)
      } catch (err) {
        console.error('[WebSocket] Error broadcasting to capture node:', err)
      }
    }
  }
}

const broadcast = (message, excludePeerId = null) => {
  const msg = JSON.stringify(message)
  for (const [peerId, peerData] of peers) {
    if (peerId !== excludePeerId) {
      try {
        peerData.peer.send(msg)
      } catch (err) {
        console.error('[WebSocket] Error broadcasting to peer:', peerId, err)
      }
    }
  }
}

