/**
 * Shared event emitter composable
 * Provides consistent event handling across WebSocket and Meshtastic connections
 */

export function useEventEmitter() {
  const eventHandlers = ref({})
  
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
  
  return {
    on,
    off,
    emit
  }
}
