import { RECONNECT_DELAY_BASE, RECONNECT_DELAY_MAX } from '../config/game-config.mjs'
import { useEventEmitter } from './useEventEmitter.mjs'

export function useWebSocketClient() {
  const ws = ref(null)
  const connected = ref(false)
  const reconnectAttempts = ref(0)
  const messageQueue = ref([])
  const { on, off, emit } = useEventEmitter()
  
  let reconnectTimeout = null
  
  const connect = (natoName, mode) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      return
    }

    // Always connect to the same server (unified architecture)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/websocket`

    console.log('[WS Client] Connecting as', mode, 'to:', wsUrl)

    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      connected.value = true
      reconnectAttempts.value = 0

      // Register this node
      send({
        type: 'register',
        natoName,
        mode,
        timestamp: Date.now()
      })
      
      // Send any queued messages
      while (messageQueue.value.length > 0) {
        const msg = messageQueue.value.shift()
        send(msg)
      }
      
      emit('connected')
    }
    
    ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        emit('message', data)
        
        // Handle specific message types
        if (data.type) {
          emit(data.type, data)
        }
      } catch (err) {
        console.error('[WS Client] Error parsing message:', err)
      }
    }
    
    ws.value.onclose = () => {
      connected.value = false
      emit('disconnected')

      // Attempt to reconnect
      scheduleReconnect(natoName, mode)
    }
    
    ws.value.onerror = (err) => {
      console.error('[WS Client] Error:', err)
      emit('error', err)
    }
  }
  
  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    
    connected.value = false
  }
  
  const send = (message) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      // Only log important messages (not position updates or routine state syncs)
      if (message.type !== 'position-update' && message.type !== 'state-update' && message.type !== 'server-state-update') {
        console.log('[WS Client] Sending:', message.type)
      }
      ws.value.send(JSON.stringify(message))
    } else {
      console.warn('[WS Client] Not connected, queueing:', message.type)
      messageQueue.value.push(message)
    }
  }
  
  const scheduleReconnect = (natoName, mode) => {
    if (reconnectTimeout) return

    const delay = Math.min(
      RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts.value),
      RECONNECT_DELAY_MAX
    )

    reconnectAttempts.value++

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      connect(natoName, mode)
    }, delay)
  }
  
  
  onUnmounted(() => {
    disconnect()
  })
  
  return {
    connected,
    connect,
    disconnect,
    send,
    on,
    off
  }
}

