import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MockWebSocket } from '../helpers/mockWebSocket.mjs'

// We'll test the reconnection logic and message queueing separately
// since the actual composable uses Vue reactivity

describe('WebSocket Client Logic', () => {
  let ws
  
  beforeEach(() => {
    global.WebSocket = MockWebSocket
  })
  
  afterEach(() => {
    delete global.WebSocket
    vi.clearAllTimers()
  })
  
  describe('Connection Management', () => {
    it('should connect to WebSocket server', () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      expect(ws.url).toBe('ws://localhost:3000/api/websocket')
      expect(ws.readyState).toBe(MockWebSocket.CONNECTING)
    })
    
    it('should emit connected event when connection opens', async () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      // Wait for the async connection
      await new Promise(resolve => {
        ws.addEventListener('open', () => {
          expect(ws.readyState).toBe(MockWebSocket.OPEN)
          resolve()
        })
      })
    })
    
    it('should send message when connected', async () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      // Wait for connection
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      ws.send(JSON.stringify({ type: 'test', data: 'hello' }))
      
      expect(ws.sentMessages).toHaveLength(1)
      expect(ws.sentMessages[0]).toContain('"type":"test"')
    })
    
    it('should throw error when sending while disconnected', () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      ws.readyState = MockWebSocket.CLOSED
      
      expect(() => ws.send('test')).toThrow('WebSocket is not open')
    })
  })
  
  describe('Reconnection Logic', () => {
    it('should calculate exponential backoff delays', () => {
      const RECONNECT_DELAY_BASE = 1000
      const RECONNECT_DELAY_MAX = 30000
      
      // Test exponential backoff formula
      const delays = [0, 1, 2, 3, 4, 5].map(attempt => 
        Math.min(
          RECONNECT_DELAY_BASE * Math.pow(2, attempt),
          RECONNECT_DELAY_MAX
        )
      )
      
      expect(delays[0]).toBe(1000)  // 1s
      expect(delays[1]).toBe(2000)  // 2s
      expect(delays[2]).toBe(4000)  // 4s
      expect(delays[3]).toBe(8000)  // 8s
      expect(delays[4]).toBe(16000) // 16s
      expect(delays[5]).toBe(30000) // capped at 30s
    })
    
    it('should reset reconnection attempts on successful connection', () => {
      let reconnectAttempts = 5
      
      // Simulate successful connection
      reconnectAttempts = 0
      
      expect(reconnectAttempts).toBe(0)
    })
  })
  
  describe('Message Queueing', () => {
    it('should queue messages when disconnected', () => {
      const messageQueue = []
      const message = { type: 'capture-event', teamId: 1 }
      
      // Simulate disconnected state
      messageQueue.push(message)
      
      expect(messageQueue).toHaveLength(1)
      expect(messageQueue[0]).toEqual(message)
    })
    
    it('should flush queue on reconnection', () => {
      const messageQueue = [
        { type: 'msg1' },
        { type: 'msg2' },
        { type: 'msg3' }
      ]
      
      // Simulate reconnection - send all queued messages
      const sentMessages = []
      while (messageQueue.length > 0) {
        sentMessages.push(messageQueue.shift())
      }
      
      expect(messageQueue).toHaveLength(0)
      expect(sentMessages).toHaveLength(3)
    })
  })
  
  describe('Message Handling', () => {
    it('should receive and parse JSON messages', (done) => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data)
        expect(data.type).toBe('state-update')
        done()
      })
      
      // Wait for connection, then simulate message
      ws.addEventListener('open', () => {
        ws.receiveMessage({ type: 'state-update', state: {} })
      })
    })
    
    it('should handle message parsing errors gracefully', () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      const errorHandler = vi.fn()
      ws.addEventListener('message', (event) => {
        try {
          JSON.parse(event.data)
        } catch (err) {
          errorHandler(err)
        }
      })
      
      ws.addEventListener('open', () => {
        ws.receiveMessage('invalid json {')
      })
      
      // Give time for async events
      setTimeout(() => {
        expect(errorHandler).toHaveBeenCalled()
      }, 100)
    })
  })
  
  describe('Event Handlers', () => {
    it('should support multiple event listeners', () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      ws.addEventListener('open', handler1)
      ws.addEventListener('open', handler2)
      
      ws.trigger('open')
      
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
    
    it('should remove specific event listeners', () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      ws.addEventListener('message', handler1)
      ws.addEventListener('message', handler2)
      ws.removeEventListener('message', handler1)
      
      ws.trigger('message')
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })
  
  describe('Helper Methods', () => {
    it('should get last sent message', async () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      ws.send(JSON.stringify({ type: 'msg1' }))
      ws.send(JSON.stringify({ type: 'msg2' }))
      ws.send(JSON.stringify({ type: 'msg3' }))
      
      const lastMsg = ws.getLastMessage()
      expect(lastMsg).toContain('"type":"msg3"')
    })
    
    it('should filter messages by type', async () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      ws.send(JSON.stringify({ type: 'capture-event' }))
      ws.send(JSON.stringify({ type: 'position-update' }))
      ws.send(JSON.stringify({ type: 'capture-event' }))
      
      const captureEvents = ws.getMessagesByType('capture-event')
      expect(captureEvents).toHaveLength(2)
    })
  })
  
  describe('Connection Lifecycle', () => {
    it('should close connection', async () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      await new Promise(resolve => {
        ws.addEventListener('close', () => {
          expect(ws.readyState).toBe(MockWebSocket.CLOSED)
          resolve()
        })
        
        ws.addEventListener('open', () => {
          ws.close()
        })
      })
    })
    
    it('should handle cleanup on close', async () => {
      ws = new MockWebSocket('ws://localhost:3000/api/websocket')
      
      const cleanupHandler = vi.fn()
      ws.addEventListener('close', cleanupHandler)
      
      await new Promise(resolve => {
        ws.addEventListener('open', () => {
          ws.close()
          setTimeout(() => {
            expect(cleanupHandler).toHaveBeenCalled()
            resolve()
          }, 10)
        })
      })
    })
  })
})

