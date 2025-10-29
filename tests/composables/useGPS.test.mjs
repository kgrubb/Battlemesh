import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGPS } from '../../app/composables/useGPS.mjs'


// Mock TextDecoder and TextEncoder
global.TextDecoder = vi.fn().mockImplementation(() => ({
  decode: vi.fn().mockReturnValue('mocked text')
}))

global.TextEncoder = vi.fn().mockImplementation(() => ({
  encode: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3]))
}))

describe('useGPS', () => {
  let gps

  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure navigator is defined
    if (typeof global.navigator === 'undefined') {
      global.navigator = {}
    }
    // Reset navigator properties
    global.navigator.serial = null
    global.navigator.geolocation = null
    gps = useGPS()
  })

         afterEach(async () => {
           if (gps && gps.stop) {
             try {
               await gps.stop()
             } catch {
               // Ignore cleanup errors in tests
             }
           }
         })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      expect(gps.position.value).toBeNull()
      expect(gps.accuracy.value).toBeNull()
      expect(gps.source.value).toBeNull()
      expect(gps.error.value).toBeNull()
    })

    it('should check if GPS is supported', () => {
      // No APIs available
      expect(gps.isSupported()).toBe(false)

      // Only geolocation available
      global.navigator.geolocation = {}
      expect(gps.isSupported()).toBe(true)

      // Only serial available
      global.navigator.geolocation = null
      global.navigator.serial = {}
      expect(gps.isSupported()).toBe(true)

      // Both available
      global.navigator.geolocation = {}
      expect(gps.isSupported()).toBe(true)
    })
  })

  describe('Browser Geolocation', () => {
    beforeEach(() => {
      global.navigator.geolocation = {
        watchPosition: vi.fn(),
        clearWatch: vi.fn()
      }
    })

    it('should start browser geolocation when serial not available', async () => {
      const mockWatchId = 123
      global.navigator.geolocation.watchPosition.mockReturnValue(mockWatchId)

      await gps.startSerial()

      expect(gps.source.value).toBe('browser')
      expect(global.navigator.geolocation.watchPosition).toHaveBeenCalled()
    })

           it('should handle geolocation success', () => {
             const mockWatchId = 123
             global.navigator.geolocation.watchPosition.mockImplementation((success) => {
               // Simulate successful position
               setTimeout(() => {
                 success({
                   coords: {
                     latitude: 40.7128,
                     longitude: -74.0060,
                     accuracy: 10
                   }
                 })
               }, 0)
               return mockWatchId
             })

      gps.startBrowserGeolocation()

      return new Promise(resolve => {
        setTimeout(() => {
          expect(gps.position.value).toEqual({
            lat: 40.7128,
            lon: -74.0060
          })
          expect(gps.accuracy.value).toBe(10)
          expect(gps.error.value).toBeNull()
          resolve()
        }, 10)
      })
    })

           it('should handle geolocation error', () => {
             const mockWatchId = 123
             global.navigator.geolocation.watchPosition.mockImplementation((success, error) => {
               // Simulate error
               setTimeout(() => {
                 error({ message: 'Location access denied' })
               }, 0)
               return mockWatchId
             })

      gps.startBrowserGeolocation()

      return new Promise(resolve => {
        setTimeout(() => {
          expect(gps.error.value).toBe('Location access denied')
          resolve()
        }, 10)
      })
    })

    it('should handle geolocation not supported', () => {
      global.navigator.geolocation = null

      gps.startBrowserGeolocation()

      expect(gps.error.value).toBe('Geolocation not supported')
    })
  })

  describe('Serial GPS', () => {
    beforeEach(() => {
      global.navigator.serial = {
        requestPort: vi.fn(),
        open: vi.fn()
      }
    })

    it('should start serial GPS when available', async () => {
      const mockPort = {
        open: vi.fn(),
        readable: {
          pipeTo: vi.fn()
        }
      }

      global.navigator.serial.requestPort.mockResolvedValue(mockPort)

      await gps.startSerial()

      expect(global.navigator.serial.requestPort).toHaveBeenCalled()
      expect(mockPort.open).toHaveBeenCalledWith({ baudRate: 9600 })
      expect(gps.source.value).toBe('serial')
    })

    it('should fallback to browser geolocation on serial error', async () => {
      global.navigator.serial.requestPort.mockRejectedValue(new Error('Serial port error'))
      global.navigator.geolocation = {
        watchPosition: vi.fn().mockReturnValue(123)
      }

      await gps.startSerial()

      expect(gps.error.value).toBe('Serial port error')
      expect(gps.source.value).toBe('browser')
    })

    it('should fallback to browser geolocation when serial not supported', async () => {
      global.navigator.serial = null
      global.navigator.geolocation = {
        watchPosition: vi.fn().mockReturnValue(123)
      }

      await gps.startSerial()

      expect(gps.source.value).toBe('browser')
    })
  })

  describe('Cleanup', () => {
    it('should stop all GPS tracking', async () => {
      // Mock geolocation
      global.navigator.geolocation = {
        watchPosition: vi.fn().mockReturnValue(123),
        clearWatch: vi.fn()
      }

      // Start geolocation to set up watchId
      gps.startBrowserGeolocation()

      await gps.stop()

      expect(global.navigator.geolocation.clearWatch).toHaveBeenCalled()
      expect(gps.source.value).toBeNull()
    })

    it('should handle cleanup errors gracefully', async () => {
      // Should not throw even with no active tracking
      await expect(gps.stop()).resolves.toBeUndefined()
    })
  })
})
