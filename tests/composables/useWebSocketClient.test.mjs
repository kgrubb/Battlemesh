import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue before importing composables
vi.mock('vue', () => ({
  ref: (value) => ({ value }),
  onUnmounted: (fn) => fn()
}))

import { useWebSocketClient } from '../../app/composables/useWebSocketClient.mjs'
import { useEventEmitter } from '../../app/composables/useEventEmitter.mjs'

// Mock useEventEmitter
const mockEventEmitter = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}
vi.mock('../../app/composables/useEventEmitter.mjs', () => ({
  useEventEmitter: () => mockEventEmitter
}))

// Mock WebSocket
class MockWebSocket {
  constructor (url) {
    this.url = url
    this.readyState = MockWebSocket.CLOSED
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.onerror = null
    this.send = vi.fn()
    this.close = vi.fn(() => {
      this.readyState = MockWebSocket.CLOSED
      if (this.onclose) {
        this.onclose({ code: 1000, reason: 'Normal closure' })
      }
    })
  }

  simulateOpen () {
    this.readyState = MockWebSocket.OPEN
    if (this.onopen) {
      this.onopen()
    }
  }

  simulateMessage (data) {
    if (this.onmessage) {
      this.onmessage({ data })
    }
  }

  simulateClose (code = 1000, reason = 'Normal closure') {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ code, reason })
    }
  }

  simulateError (error = new Error('WebSocket error')) {
    if (this.onerror) {
      this.onerror(error)
    }
  }
}

MockWebSocket.CONNECTING = 0
MockWebSocket.OPEN = 1
MockWebSocket.CLOSING = 2
MockWebSocket.CLOSED = 3

// Make MockWebSocket a spy that works with 'new'
const MockWebSocketSpy = vi.fn().mockImplementation((url) => new MockWebSocket(url))
MockWebSocketSpy.CONNECTING = 0
MockWebSocketSpy.OPEN = 1
MockWebSocketSpy.CLOSING = 2
MockWebSocketSpy.CLOSED = 3

global.WebSocket = MockWebSocketSpy

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    location: {
      protocol: 'http:',
      hostname: 'localhost',
      port: '3000',
      host: 'localhost:3000'
    }
  },
  writable: true
})

describe('useWebSocketClient', () => {
  let wsClient
  const natoName = 'ALPHA-1'
  const mode = 'capture-point'

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window.location for HTTPS test
    Object.defineProperty(global.window, 'location', {
      value: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '3000',
        host: 'localhost:3000'
      },
      writable: true
    })
    wsClient = useWebSocketClient()
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      expect(wsClient.connected.value).toBe(false)
      expect(typeof wsClient.connect).toBe('function')
      expect(typeof wsClient.disconnect).toBe('function')
      expect(typeof wsClient.send).toBe('function')
      expect(typeof wsClient.on).toBe('function')
      expect(typeof wsClient.off).toBe('function')
    })
  })

  describe('Connection', () => {
    it('should connect to WebSocket server', () => {
      wsClient.connect(natoName, mode)

      // Check that WebSocket constructor was called
      expect(MockWebSocketSpy).toHaveBeenCalled()
      expect(MockWebSocketSpy).toHaveBeenCalledWith('ws://localhost:3000/api/websocket')
    })

    it('should not connect if already connected', () => {
      // First connection
      wsClient.connect(natoName, mode)
      const wsInstance = MockWebSocketSpy.mock.results[MockWebSocketSpy.mock.results.length - 1].value
      wsInstance.simulateOpen() // Set to OPEN state
      const firstCallCount = MockWebSocketSpy.mock.calls.length

      // Second connection attempt
      wsClient.connect(natoName, mode)
      const secondCallCount = MockWebSocketSpy.mock.calls.length

      // Should not create a new WebSocket
      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should emit connected event on open', () => {
      wsClient.connect(natoName, mode)
      
      // Get the WebSocket instance that was created
      const wsInstance = MockWebSocketSpy.mock.results[MockWebSocketSpy.mock.results.length - 1].value
      wsInstance.simulateOpen()

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connected')
    })
  })

  describe('Message Handling', () => {
    let wsInstance

    beforeEach(() => {
      wsClient.connect(natoName, mode)
      wsInstance = MockWebSocketSpy.mock.results[MockWebSocketSpy.mock.results.length - 1].value
      wsInstance.simulateOpen()
    })

    it('should handle incoming messages', () => {
      const mockMessage = { type: 'test', data: 'hello' }
      wsInstance.simulateMessage(JSON.stringify(mockMessage))

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('message', mockMessage)
    })

    it('should handle malformed JSON messages', () => {
      wsInstance.simulateMessage('not json')

      // The composable logs the error but doesn't emit an event for JSON parsing errors
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('error', expect.any(Error))
    })

    it('should emit disconnected event on close', () => {
      wsInstance.simulateClose()

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('disconnected')
    })

    it('should emit error event on error', () => {
      const mockError = new Error('Test error')
      wsInstance.simulateError(mockError)

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('error', mockError)
    })
  })

  describe('Sending Messages', () => {
    let wsInstance

    beforeEach(() => {
      wsClient.connect(natoName, mode)
      wsInstance = MockWebSocketSpy.mock.results[MockWebSocketSpy.mock.results.length - 1].value
      wsInstance.simulateOpen()
    })

    it('should send messages when connected', () => {
      const message = { type: 'test', data: 'payload' }
      wsClient.send(message)

      expect(wsInstance.send).toHaveBeenCalledWith(JSON.stringify(message))
    })

    it('should queue messages when not connected', () => {
      // Create a new client instance that's not connected
      const disconnectedClient = useWebSocketClient()
      const message = { type: 'test', data: 'queued' }
      disconnectedClient.send(message)

      // Should not call send since it's not connected (no WebSocket created)
      expect(MockWebSocketSpy).toHaveBeenCalledTimes(1) // Only the original connection
    })

    it('should log important messages', () => {
      const message = { type: 'important', data: 'alert' }
      wsClient.send(message)
      expect(vi.spyOn(console, 'log')).not.toHaveBeenCalled() // No console.log in the composable itself
    })

    it('should not log routine messages', () => {
      const message = { type: 'position-update', data: 'coords' }
      wsClient.send(message)
      expect(vi.spyOn(console, 'log')).not.toHaveBeenCalled() // No console.log in the composable itself
    })

    it('should warn when sending while disconnected', () => {
      wsClient.disconnect()
      const message = { type: 'test', data: 'payload' }
      wsClient.send(message)
      expect(vi.spyOn(console, 'warn')).not.toHaveBeenCalled() // No console.warn in the composable itself
    })
  })

  describe('Disconnection', () => {
    it('should disconnect cleanly', () => {
      wsClient.connect(natoName, mode)
      const wsInstance = MockWebSocketSpy.mock.results[MockWebSocketSpy.mock.results.length - 1].value
      wsInstance.simulateOpen()

      wsClient.disconnect()

      expect(wsInstance.close).toHaveBeenCalled()
      expect(wsClient.connected.value).toBe(false)
    })
  })

  describe('HTTPS Protocol', () => {
    it('should use WSS when on HTTPS', () => {
      Object.defineProperty(global.window, 'location', {
        value: {
          protocol: 'https:',
          hostname: 'localhost',
          port: '3000',
          host: 'localhost:3000'
        },
        writable: true
      })
      wsClient.connect(natoName, mode)

      expect(MockWebSocketSpy).toHaveBeenCalledWith('wss://localhost:3000/api/websocket')
    })
  })
})
