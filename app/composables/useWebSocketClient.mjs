import { RECONNECT_DELAY_BASE, RECONNECT_DELAY_MAX } from '~/config/game-config.mjs'

export function useWebSocketClient() {
  const ws = ref(null)
  const connected = ref(false)
  const reconnectAttempts = ref(0)
  const messageQueue = ref([])
  const eventHandlers = ref({})
  
  let reconnectTimeout = null
  
  const connect = (natoName, mode) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      return
    }

    const config = useRuntimeConfig()
    let wsUrl

    // For capture nodes, use admin URL if provided
    if (mode === 'capture-point' && config.public.adminUrl) {
      wsUrl = config.public.adminUrl
      console.log('[WS Client] Using configured admin URL:', wsUrl)
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/api/websocket`
      console.log('[WS Client] Using local WebSocket:', wsUrl)
    }

    console.log('[WS Client] Connecting as', mode, 'to:', wsUrl)

    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      console.log('[WS Client] ✓ Connected as', mode)
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
      console.log('[WS Client] Disconnected')
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

    console.log(`[WS Client] Reconnecting in ${delay}ms...`)
    reconnectAttempts.value++

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      connect(natoName, mode)
    }, delay)
  }
  
  const on = (eventType, handler) => {
    if (!eventHandlers.value[eventType]) {
      eventHandlers.value[eventType] = []
    }
    if (Array.isArray(eventHandlers.value[eventType])) {
      eventHandlers.value[eventType].push(handler)
    } else {
      const existing = eventHandlers.value[eventType]
      eventHandlers.value[eventType] = [existing, handler]
    }
  }
  
  const off = (eventType, handler) => {
    if (eventHandlers.value[eventType]) {
      if (Array.isArray(eventHandlers.value[eventType])) {
        eventHandlers.value[eventType] = eventHandlers.value[eventType].filter(h => h !== handler)
      } else {
        delete eventHandlers.value[eventType]
      }
    }
  }
  
  const emit = (eventType, data) => {
    const handlers = eventHandlers.value[eventType]
    if (handlers) {
      if (Array.isArray(handlers)) {
        handlers.forEach(handler => handler(data))
      } else {
        handlers(data)
      }
    }
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

