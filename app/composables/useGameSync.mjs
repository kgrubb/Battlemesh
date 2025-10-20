import { useGameState } from '~/stores/gameState.mjs'
import { useWebSocketClient } from './useWebSocketClient.mjs'
import { useMeshtastic } from './useMeshtastic.mjs'

export function useGameSync() {
  const gameState = useGameState()
  const wsClient = useWebSocketClient()
  const meshtastic = useMeshtastic()
  
  const activeNetwork = ref(null)
  
  const initialize = () => {
    // Connect based on network mode
    if (gameState.networkMode === 'wifi') {
      connectWiFi()
    } else if (gameState.networkMode === 'meshtastic') {
      connectMeshtastic()
    }
    
    // Setup message handlers
    setupMessageHandlers()
  }
  
  const connectWiFi = () => {
    wsClient.connect(gameState.localNodeName, gameState.nodeMode)
    activeNetwork.value = 'wifi'
  }
  
  const connectMeshtastic = async () => {
    try {
      await meshtastic.connect()
      activeNetwork.value = 'meshtastic'
    } catch {
      console.error('[GameSync] Meshtastic connection failed, falling back to WiFi')
      connectWiFi()
    }
  }
  
  const setupMessageHandlers = () => {
    // WebSocket message handlers
    wsClient.on('message', handleMessage)
    wsClient.on('connected', () => {
      gameState.adminConnected = true
    })
    wsClient.on('disconnected', () => {
      if (gameState.nodeMode === 'capture-point') {
        gameState.adminConnected = false
      }
    })
    
    // Meshtastic message handlers
    meshtastic.on('message', handleMessage)
    meshtastic.on('connected', () => {
      // Meshtastic connected
    })
  }
  
  const handleMessage = (data) => {
    switch (data.type) {
      case 'server-state':
        // Receiving authoritative server state
        if (data.state) {
          if (gameState.nodeMode === 'admin') {
            gameState.syncFromServer(data.state)
          } else {
            gameState.syncFromAdmin(data.state)
          }
        }
        break
        
      case 'state-sync':
      case 'state-update':
        // Capture node receiving state from admin
        if (gameState.nodeMode === 'capture-point') {
          gameState.syncFromAdmin(data.state)
        }
        break
        
      case 'capture-event':
        // Admin receiving capture event from node (uses NATO name)
        if (gameState.nodeMode === 'admin') {
          gameState.handleCaptureEvent(data.natoName, data.teamId)
          // Immediately broadcast updated state to all nodes
          setTimeout(() => {
            broadcastState()
          }, 0)
        }
        break
        
      case 'position-update':
        // Admin receiving GPS position from node (uses NATO name)
        if (gameState.nodeMode === 'admin') {
          gameState.updateNodePosition(data.natoName, data.position)
          // Broadcast updated positions to all capture nodes for tactical map
          broadcastState()
        }
        break
        
      case 'node-joined':
        // Node joined the network (uses NATO name)
        if (gameState.nodeMode === 'admin' && data.mode === 'capture-point') {
          const existingNode = gameState.nodes.find(n => n.id === data.natoName)
          const existingCp = gameState.capturePoints.find(cp => cp.id === data.natoName)
          
          if (existingCp) {
            // Capture point exists (from persisted state) - preserve it
            // Just ensure node entry exists for connection tracking
            if (!existingNode) {
              const node = { id: data.natoName, mode: data.mode, status: 'online', lastSeen: Date.now(), position: existingCp.position }
              gameState.nodes.push(node)
            } else {
              existingNode.status = 'online'
              existingNode.lastSeen = Date.now()
            }
          } else {
            // New node - create both node and capture point
            gameState.addNode(data.natoName, data.mode)
          }
          broadcastState()
        }
        break
        
      case 'node-left':
        // Node left the network (uses NATO name)
        if (gameState.nodeMode === 'admin') {
          gameState.removeNode(data.natoName)
          broadcastState()
        }
        break
        
      case 'node-disconnect':
        // Node disconnected (uses NATO name)
        if (gameState.nodeMode === 'admin' && data.natoName) {
          gameState.handleNodeDisconnect(data.natoName)
        }
        break
      
    }
  }
  
  const broadcastState = () => {
    if (gameState.nodeMode !== 'admin') return
    
    const state = gameState.getFullState()
    
    // Only send state update to capture nodes (not to server)
    // Server state is updated through specific actions (captures, team changes, etc.)
    const message = {
      type: 'state-update',
      state,
      timestamp: Date.now()
    }
    
    send(message)
  }
  
  const sendCaptureEvent = (teamId) => {
    const event = gameState.captureForTeam(teamId)
    if (event) {
      send(event)
    } else {
      console.error('[GameSync] ✗ Failed to create capture event')
    }
  }
  
  const sendPositionUpdate = (position) => {
    const message = {
      type: 'position-update',
      natoName: gameState.localNodeName,
      position,
      timestamp: Date.now()
    }
    send(message)
  }
  
  const send = (message) => {
    if (activeNetwork.value === 'wifi' && wsClient.connected.value) {
      wsClient.send(message)
    } else if (activeNetwork.value === 'meshtastic' && meshtastic.connected.value) {
      meshtastic.send(message)
    }
  }
  
  const switchNetworkMode = async (mode) => {
    
    // Disconnect current
    if (activeNetwork.value === 'wifi') {
      wsClient.disconnect()
    } else if (activeNetwork.value === 'meshtastic') {
      await meshtastic.disconnect()
    }
    
    // Update state
    gameState.switchNetworkMode(mode)
    
    // Connect new
    if (mode === 'wifi') {
      connectWiFi()
    } else if (mode === 'meshtastic') {
      await connectMeshtastic()
    }
  }
  
  const cleanup = () => {
    wsClient.disconnect()
    meshtastic.disconnect()
  }
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    initialize,
    broadcastState,
    sendCaptureEvent,
    sendPositionUpdate,
    switchNetworkMode,
    activeNetwork,
    wsClient,
    meshtastic
  }
}

