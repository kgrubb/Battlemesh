import { describe, it, expect, beforeEach } from 'vitest'
import { useEventEmitter } from '../../app/composables/useEventEmitter.mjs'

describe('useEventEmitter', () => {
  let eventEmitter

  beforeEach(() => {
    eventEmitter = useEventEmitter()
  })

  describe('Event Registration and Emission', () => {
    it('should register and emit events', () => {
      let receivedData = null
      
      eventEmitter.on('test-event', (data) => {
        receivedData = data
      })
      
      eventEmitter.emit('test-event', { message: 'test' })
      
      expect(receivedData).toEqual({ message: 'test' })
    })

    it('should handle multiple listeners for same event', () => {
      const listeners = []
      
      eventEmitter.on('multi-event', (data) => listeners.push(`listener1: ${data}`))
      eventEmitter.on('multi-event', (data) => listeners.push(`listener2: ${data}`))
      
      eventEmitter.emit('multi-event', 'test')
      
      expect(listeners).toHaveLength(2)
      expect(listeners).toContain('listener1: test')
      expect(listeners).toContain('listener2: test')
    })

    it('should emit events without listeners without error', () => {
      expect(() => {
        eventEmitter.emit('non-existent-event', 'data')
      }).not.toThrow()
    })

    it('should handle events with no data', () => {
      let called = false
      
      eventEmitter.on('no-data-event', () => {
        called = true
      })
      
      eventEmitter.emit('no-data-event')
      
      expect(called).toBe(true)
    })
  })

  describe('Event Unsubscription', () => {
    it('should unsubscribe specific listener', () => {
      const listener1Calls = []
      const listener2Calls = []
      
      const listener1 = (data) => listener1Calls.push(data)
      const listener2 = (data) => listener2Calls.push(data)
      
      const unsubscribe1 = eventEmitter.on('unsub-test', listener1)
      eventEmitter.on('unsub-test', listener2)
      
      eventEmitter.emit('unsub-test', 'first')
      
      unsubscribe1()
      
      eventEmitter.emit('unsub-test', 'second')
      
      expect(listener1Calls).toEqual(['first'])
      expect(listener2Calls).toEqual(['first', 'second'])
    })

    it('should unsubscribe multiple listeners', () => {
      const calls = []
      
      const unsubscribe1 = eventEmitter.on('unsub-all-test', (data) => calls.push(`listener1: ${data}`))
      const unsubscribe2 = eventEmitter.on('unsub-all-test', (data) => calls.push(`listener2: ${data}`))
      
      eventEmitter.emit('unsub-all-test', 'first')
      
      unsubscribe1()
      unsubscribe2()
      
      eventEmitter.emit('unsub-all-test', 'second')
      
      expect(calls).toEqual(['listener1: first', 'listener2: first'])
    })

    it('should handle unsubscribing non-existent listener gracefully', () => {
      expect(() => {
        const unsubscribe = eventEmitter.on('test-event', () => {})
        unsubscribe()
        unsubscribe() // Should be safe to call multiple times
      }).not.toThrow()
    })
  })

  describe('Event Cleanup', () => {
    it('should clean up all listeners', () => {
      const calls = []
      
      const unsubscribe1 = eventEmitter.on('cleanup-test', (data) => calls.push(data))
      const unsubscribe2 = eventEmitter.on('other-event', (data) => calls.push(data))
      
      eventEmitter.emit('cleanup-test', 'before')
      eventEmitter.emit('other-event', 'before')
      
      // Simulate cleanup (this would be called in onUnmounted)
      unsubscribe1()
      unsubscribe2()
      
      eventEmitter.emit('cleanup-test', 'after')
      eventEmitter.emit('other-event', 'after')
      
      expect(calls).toEqual(['before', 'before'])
    })
  })

  describe('Error Handling', () => {
    it('should propagate listener errors', () => {
      const errorListener = () => {
        throw new Error('Listener error')
      }
      // const __normalListener = (data) => data
      
      let normalResult = null
      
      eventEmitter.on('error-test', errorListener)
      eventEmitter.on('error-test', (data) => {
        normalResult = data
      })
      
      // Should throw error from first listener
      expect(() => {
        eventEmitter.emit('error-test', 'test')
      }).toThrow('Listener error')
      
      // Normal listener should not be called due to error
      expect(normalResult).toBeNull()
    })

    it('should propagate multiple listener errors', () => {
      const errorListener1 = () => { throw new Error('Error 1') }
      const errorListener2 = () => { throw new Error('Error 2') }
      
      eventEmitter.on('multi-error-test', errorListener1)
      eventEmitter.on('multi-error-test', errorListener2)
      
      expect(() => {
        eventEmitter.emit('multi-error-test', 'test')
      }).toThrow('Error 1')
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle listener that subscribes to another event', () => {
      const results = []
      
      eventEmitter.on('trigger-event', () => {
        results.push('triggered')
        eventEmitter.emit('nested-event', 'nested')
      })
      
      eventEmitter.on('nested-event', (data) => {
        results.push(data)
      })
      
      eventEmitter.emit('trigger-event')
      
      expect(results).toEqual(['triggered', 'nested'])
    })

    it('should handle listener that unsubscribes itself', () => {
      let callCount = 0
      let unsubscribe
      const selfUnsubListener = () => {
        callCount++
        if (callCount === 1) {
          unsubscribe()
        }
      }
      
      unsubscribe = eventEmitter.on('self-unsub-test', selfUnsubListener)
      
      eventEmitter.emit('self-unsub-test')
      eventEmitter.emit('self-unsub-test')
      
      expect(callCount).toBe(1)
    })

    it('should handle rapid event emission', () => {
      let count = 0
      
      eventEmitter.on('rapid-test', () => count++)
      
      // Emit 100 events rapidly
      for (let i = 0; i < 100; i++) {
        eventEmitter.emit('rapid-test')
      }
      
      expect(count).toBe(100)
    })
  })
})
