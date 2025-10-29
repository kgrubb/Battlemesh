 
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

// Simple synchronous WebSocket mock
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN immediately
    this.onopen = null
    this.onclose = null
    this.onerror = null
    this.onmessage = null
  }
  
  send = vi.fn()
  close = vi.fn()
}

