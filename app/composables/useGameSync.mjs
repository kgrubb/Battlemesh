import { ref, onUnmounted } from 'vue'
import { useGameState } from '~/stores/gameState.mjs'
import { useSSEClient } from './useSSEClient.mjs'
import { useMeshtastic } from './useMeshtastic.mjs'

export function useGameSync() {
  const gameState = useGameState()
  const sseClient = useSSEClient()
  const meshtastic = useMeshtastic()
  
  const activeNetwork = ref(null)
  let storedPin = null
  
  const initialize = async (pin = null) => {
    if (pin) {
      storedPin = pin
    }
    
    setupMessageHandlers()
    sseClient.connect()
    if (gameState.networkMode === 'meshtastic') {
      connectMeshtastic()
    } else {
      activeNetwork.value = 'wifi'
    }

    await registerNode(pin)
  }
  
  const connectWiFi = () => {
    activeNetwork.value = 'wifi'
  }

  const registerNode = async (pin = null) => {
    try {
      const body = { mode: gameState.nodeMode, natoName: gameState.localNodeName }
      const headers = gameState.nodeMode === 'admin' && (pin || storedPin) ? { 'X-Admin-Pin': pin || storedPin } : {}
      const resp = await $fetch('/api/nodes/register', { method: 'POST', body, headers })
      if (resp?.natoName && gameState.nodeMode === 'capture-point') {
        gameState.updateNatoName(resp.natoName)
      }
      return resp
    } catch (err) {
      console.error('[GameSync] Registration failed:', err)
      throw err
    }
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
    sseClient.on('state', (state) => handleMessage({ type: 'server-state', state }))
    sseClient.on('node-joined', handleMessage)
    sseClient.on('node-left', handleMessage)
    sseClient.on('node-disconnect', handleMessage)
    sseClient.on('connected', () => {
      gameState.adminConnected = true
    })
    sseClient.on('disconnected', () => {
      if (gameState.nodeMode === 'capture-point') {
        gameState.adminConnected = false
      }
    })

    meshtastic.on('message', handleMessage)
  }
  
  const handleMessage = (data) => {
    switch (data.type) {
      case 'server-state':
        if (data.state) {
          if (gameState.nodeMode === 'admin') {
            gameState.syncFromServer(data.state)
          } else {
            gameState.syncFromAdmin(data.state)
          }
        }
        break
        
      case 'node-joined':
        console.log('[GameSync] Received node-joined:', data.natoName, 'mode:', data.mode)
        if (gameState.nodeMode === 'admin' && data.mode === 'capture-point') {
          gameState.addNode(data.natoName, data.mode)
        }
        break
        
      case 'node-left':
        if (gameState.nodeMode === 'admin') {
          gameState.removeNode(data.natoName)
        }
        break
        
      case 'node-disconnect':
        if (gameState.nodeMode === 'admin' && data.natoName) {
          gameState.handleNodeDisconnect(data.natoName)
        }
        break
    }
  }
  
  const sendCommand = async (command) => {
    if (!command) {
      console.warn('[GameSync] No command to send')
      return
    }
    await httpSend(command)
  }
  
  const sendCaptureEvent = async (teamId) => {
    const event = gameState.captureForTeam(teamId)
    if (event) {
      await httpSend(event)
    } else {
      console.error('[GameSync] ✗ Failed to create capture event')
    }
  }
  
  const sendPositionUpdate = async (position) => {
    const message = {
      type: 'position-update',
      natoName: gameState.localNodeName,
      position,
      timestamp: Date.now()
    }
    await httpSend(message)
  }
  
  const httpSend = async (message) => {
    try {
      switch (message.type) {
        case 'start-game-command':
          await $fetch('/api/game/start', { method: 'POST', headers: adminHeaders() })
          break
        case 'stop-game-command':
          await $fetch('/api/game/stop', { method: 'POST', headers: adminHeaders() })
          break
        case 'reset-game-command':
          await $fetch('/api/game/reset', { method: 'POST', headers: adminHeaders() })
          break
        case 'add-team-command':
          await $fetch('/api/teams/add', { method: 'POST', body: { name: message.name, color: message.color }, headers: adminHeaders() })
          break
        case 'update-team-command':
          await $fetch('/api/teams/update', { method: 'POST', body: { teamId: message.teamId, updates: message.updates }, headers: adminHeaders() })
          break
        case 'remove-team-command':
          await $fetch('/api/teams/remove', { method: 'POST', body: { teamId: message.teamId }, headers: adminHeaders() })
          break
        case 'position-update':
          await $fetch('/api/position', { method: 'POST', body: { natoName: message.natoName, position: message.position, type: 'gps' } })
          break
        case 'update-position-command':
          await $fetch('/api/position', { method: 'POST', body: { natoName: message.natoName, position: message.position, type: 'gps' }, headers: adminHeaders() })
          break
        case 'set-static-position-command':
          await $fetch('/api/position', { method: 'POST', body: { natoName: message.natoName, position: message.position, type: 'static' }, headers: adminHeaders() })
          break
        case 'toggle-position-source-command':
          await $fetch('/api/position/toggle', { method: 'POST', body: { natoName: message.natoName }, headers: adminHeaders() })
          break
        case 'capture-event':
          await $fetch('/api/capture', { method: 'POST', body: { natoName: message.natoName, teamId: message.teamId } })
          break
      }
    } catch (err) {
      console.error('[GameSync] HTTP send failed:', err)
    }
  }

  const adminHeaders = () => (gameState.isAdmin && storedPin ? { 'X-Admin-Pin': storedPin } : {})
  
  const switchNetworkMode = async (mode) => {
    if (activeNetwork.value === 'wifi') {
      sseClient.disconnect()
    } else if (activeNetwork.value === 'meshtastic') {
      await meshtastic.disconnect()
    }
    
    gameState.switchNetworkMode(mode)
    
    if (mode === 'wifi') {
      connectWiFi()
    } else if (mode === 'meshtastic') {
      await connectMeshtastic()
    }
  }
  
  const cleanup = () => {
    sseClient.disconnect()
    meshtastic.disconnect()
  }
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    initialize,
    sendCommand,
    sendCaptureEvent,
    sendPositionUpdate,
    switchNetworkMode,
    activeNetwork,
    sseClient,
    meshtastic
  }
}

