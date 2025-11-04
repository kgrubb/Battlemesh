import { ref } from 'vue'

/**
 * Shared event emitter composable
 * Provides consistent event handling across SSE and Meshtastic connections
 */

export function useEventEmitter() {
  const handlersByEvent = ref(new Map())

  const off = (eventType, handler) => {
    const existing = handlersByEvent.value.get(eventType)
    if (!existing) return
    const next = existing.filter(h => h !== handler)
    if (next.length === 0) handlersByEvent.value.delete(eventType)
    else handlersByEvent.value.set(eventType, next)
  }

  const on = (eventType, handler) => {
    const existing = handlersByEvent.value.get(eventType) || []
    handlersByEvent.value.set(eventType, [...existing, handler])
    return () => off(eventType, handler)
  }

  const emit = (eventType, data) => {
    const listeners = handlersByEvent.value.get(eventType) || []
    for (const listener of listeners) listener(data)
  }

  return { on, emit }
}
