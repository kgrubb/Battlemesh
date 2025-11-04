 
// Minimal mocks for test environment

// Mock Vue composables globally - MUST be first
import { vi } from 'vitest'

vi.mock('vue', () => ({
  ref: (value) => ({ value }),
  onUnmounted: (fn) => fn()
}))

// Mock navigator APIs
if (typeof global.navigator === 'undefined') {
  global.navigator = {}
}

global.navigator.bluetooth = { requestDevice: vi.fn() }
global.navigator.serial = { requestPort: vi.fn() }
global.navigator.geolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(() => 1),
  clearWatch: vi.fn()
}
global.navigator.vibrate = vi.fn()

// Mock EventSource for SSE tests
global.EventSource = class EventSource {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    this.onopen = null
    this.onerror = null
    this._listeners = new Map()
    
    // Auto-open in tests
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 0)
  }
  
  addEventListener(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, [])
    }
    this._listeners.get(event).push(handler)
  }
  
  removeEventListener(event, handler) {
    const handlers = this._listeners.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) handlers.splice(index, 1)
    }
  }
  
  // Test helpers
  _emit(event, data) {
    const handlers = this._listeners.get(event) || []
    handlers.forEach(h => h({ data: typeof data === 'string' ? data : JSON.stringify(data) }))
  }
  
  close = vi.fn(() => {
    this.readyState = 2 // CLOSED
    if (this.onerror) this.onerror()
  })
}

