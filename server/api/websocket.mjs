import { defineWebSocketHandler } from 'h3'
import * as stateManager from '../utils/gameStateManager.mjs'

const peers = new Map() // peerId -> { peer, natoName, mode, lastSeen }
let adminPeer = null

// Initialize state manager on startup
stateManager.initialize().then(() => {
  console.log('[WebSocket] Server state initialized')
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
          // Node registration - data.natoName is provided by client
          peerData.natoName = data.natoName
          peerData.mode = data.mode
          
          if (data.mode === 'admin') {
            adminPeer = peer
            console.log('[WebSocket] ✓ Admin registered:', peerData.natoName)
            
            // Send current server state to admin
            const serverState = stateManager.getState()
            const activeNodes = []
            
            // Build list of currently connected nodes (use NATO names)
            for (const [, pData] of peers) {
              if (pData.natoName && pData.mode) {
                activeNodes.push({
                  id: pData.natoName, // NATO name is the ID
                  mode: pData.mode,
                  status: 'online',
                  lastSeen: pData.lastSeen
                })
              }
            }
            
            peer.send(JSON.stringify({
              type: 'server-state',
              state: {
                ...serverState,
                nodes: activeNodes // Use NATO names
              },
              timestamp: Date.now()
            }))
          } else {
            console.log('[WebSocket] ✓ Capture node registered:', peerData.natoName)
            
            // Send current server state to this capture node (for reconnection)
            const serverState = stateManager.getState()
            peer.send(JSON.stringify({
              type: 'server-state',
              state: serverState,
              timestamp: Date.now()
            }))
            
            // Notify admin about this node
            if (adminPeer && adminPeer !== peer) {
              adminPeer.send(JSON.stringify({
                type: 'node-joined',
                natoName: peerData.natoName,
                mode: data.mode,
                timestamp: Date.now()
              }))
            }
          }
          
          // Notify all OTHER peers about new node
          broadcast({
            type: 'node-joined',
            natoName: peerData.natoName,
            mode: data.mode,
            timestamp: Date.now()
          }, peer.id)
          break
        }
          
        case 'state-update':
          // Admin broadcasting state to all capture nodes
          if (peerData.mode === 'admin') {
            broadcastToCaptureNodes({
              type: 'state-sync',
              state: data.state,
              timestamp: Date.now()
            })
          }
          break
          
        case 'capture-event':
          // Capture node sending event to admin (with NATO name)
          console.log('[WebSocket] ✓ Capture event from', data.natoName || peerData.natoName, 'team:', data.teamId)
          if (adminPeer) {
            adminPeer.send(JSON.stringify({
              type: 'capture-event',
              natoName: data.natoName || peerData.natoName,
              teamId: data.teamId,
              timestamp: data.timestamp
            }))
          } else {
            console.error('[WebSocket] ✗ No admin connected!')
          }
          break
          
        case 'position-update':
          // Node sending GPS position (use NATO name)
          if (adminPeer && peerData.mode !== 'admin') {
            adminPeer.send(JSON.stringify({
              type: 'position-update',
              natoName: data.natoName || peerData.natoName,
              position: data.position,
              timestamp: Date.now()
            }))
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
          peer.send(JSON.stringify({
            type: 'server-state',
            state: serverState,
            timestamp: Date.now()
          }))
          break
        }
          
        case 'server-state-update': {
          // Admin updating server state (teams, game status, etc.)
          if (peerData.mode === 'admin' && data.updates) {
            // Don't overwrite nodes from admin (they're managed by WebSocket connections)
            const updates = { ...data.updates }
            delete updates.nodes // Nodes are ephemeral
            
            // Save immediately if capture points are updated (prevent data loss on quick reloads)
            const immediate = updates.capturePoints !== undefined
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
                state: freshState,
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
        adminPeer.send(JSON.stringify({
          type: 'node-disconnect',
          natoName: peerData.natoName,
          timestamp: Date.now()
        }))
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

function broadcast(message, excludePeerId = null) {
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

function broadcastToCaptureNodes(message) {
  const msg = JSON.stringify(message)
  for (const [peerId, peerData] of peers) {
    if (peerData.mode === 'capture-point') {
      try {
        peerData.peer.send(msg)
      } catch (err) {
        console.error('[WebSocket] Error broadcasting to capture node:', peerId, err)
      }
    }
  }
}
