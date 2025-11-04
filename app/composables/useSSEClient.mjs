import { ref, onUnmounted } from 'vue'
import { useEventEmitter } from './useEventEmitter.mjs'

export function useSSEClient() {
  const es = ref(null)
  const connected = ref(false)
  const { on, emit } = useEventEmitter()

  const parseAndEmit = (eventName, ev) => {
    try {
      emit(eventName, JSON.parse(ev.data))
    } catch {
      // Ignore parse errors
    }
  }

  const connect = () => {
    disconnect()
    const source = new EventSource('/api/events', { withCredentials: false })
    es.value = source

    source.onopen = () => {
      connected.value = true
      emit('connected')
    }

    source.onerror = () => {
      connected.value = false
      emit('disconnected')
    }

    source.addEventListener('state', (ev) => parseAndEmit('state', ev))
    source.addEventListener('activity', (ev) => parseAndEmit('activity', ev))
    source.addEventListener('activity-cleared', () => emit('activity-cleared'))
    source.addEventListener('node-joined', (ev) => parseAndEmit('node-joined', ev))
    source.addEventListener('node-left', (ev) => parseAndEmit('node-left', ev))
    source.addEventListener('node-disconnect', (ev) => parseAndEmit('node-disconnect', ev))
  }

  const disconnect = () => {
    es.value?.close()
    es.value = null
    connected.value = false
  }

  onUnmounted(disconnect)

  return { connect, disconnect, connected, on, es }
}


