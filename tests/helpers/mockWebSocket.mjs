/**
 * Mock WebSocket for testing
 */

export class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = MockWebSocket.CONNECTING
    this.sentMessages = []
    this.eventHandlers = {}
    
    // Simulate successful connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.trigger('open')
    }, 0)
  }
  
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  
  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    this.sentMessages.push(typeof data === 'string' ? data : JSON.stringify(data))
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED
    this.trigger('close')
  }
  
  // Simulate receiving a message
  receiveMessage(data) {
    const event = {
      data: typeof data === 'string' ? data : JSON.stringify(data)
    }
    this.trigger('message', event)
  }
  
  // Event handler methods
  addEventListener(type, handler) {
    if (!this.eventHandlers[type]) {
      this.eventHandlers[type] = []
    }
    this.eventHandlers[type].push(handler)
  }
  
  removeEventListener(type, handler) {
    if (this.eventHandlers[type]) {
      this.eventHandlers[type] = this.eventHandlers[type].filter(h => h !== handler)
    }
  }
  
  trigger(type, event = {}) {
    const handlers = this.eventHandlers[type] || []
    handlers.forEach(handler => handler(event))
    
    // Also trigger onX properties
    const propHandler = this[`on${type}`]
    if (propHandler) {
      propHandler(event)
    }
  }
  
  // Reset for next test
  reset() {
    this.sentMessages = []
    this.readyState = MockWebSocket.CONNECTING
  }
  
  // Helper to get last sent message
  getLastMessage() {
    return this.sentMessages[this.sentMessages.length - 1]
  }
  
  // Helper to get all messages of a specific type
  getMessagesByType(type) {
    return this.sentMessages
      .map(msg => {
        try {
          return JSON.parse(msg)
        } catch {
          return null
        }
      })
      .filter(msg => msg && msg.type === type)
  }
}

// Helper to install mock globally
export function installMockWebSocket() {
  global.WebSocket = MockWebSocket
  return MockWebSocket
}

// Helper to restore original WebSocket
export function restoreWebSocket() {
  delete global.WebSocket
}

