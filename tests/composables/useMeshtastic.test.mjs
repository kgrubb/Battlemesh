import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue before importing composables
vi.mock('vue', () => ({
  ref: (value) => ({ value }),
  onUnmounted: (fn) => fn()
}))

import { useMeshtastic } from '../../app/composables/useMeshtastic.mjs'
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

// Mock Web Bluetooth API
const mockCharacteristic = {
  readValue: vi.fn().mockResolvedValue(new DataView(new ArrayBuffer(0))),
  writeValue: vi.fn().mockResolvedValue(undefined),
  startNotifications: vi.fn().mockResolvedValue(undefined),
  stopNotifications: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

const mockService = {
  getCharacteristic: vi.fn().mockResolvedValue(mockCharacteristic)
}

const mockGattServer = {
  getPrimaryService: vi.fn().mockResolvedValue(mockService),
  disconnect: vi.fn()
}

const mockGatt = {
  connect: vi.fn().mockResolvedValue(mockGattServer),
  disconnect: vi.fn(),
  getServer: vi.fn(() => mockGattServer)
}

const mockDevice = {
  gatt: mockGatt,
  name: 'Mock Meshtastic Device',
  id: 'mock-device-id',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

const mockBluetooth = {
  requestDevice: vi.fn().mockResolvedValue(mockDevice),
  getAvailability: vi.fn().mockResolvedValue(true)
}

// Set up Bluetooth mock on global navigator
global.navigator.bluetooth = mockBluetooth

describe('useMeshtastic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mocks for each test
    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockBluetooth.getAvailability.mockResolvedValue(true)
    mockGatt.connect.mockResolvedValue(mockGattServer)
    mockGattServer.getPrimaryService.mockResolvedValue(mockService)
    mockService.getCharacteristic.mockResolvedValue(mockCharacteristic)
    mockCharacteristic.startNotifications.mockResolvedValue(undefined)
    mockCharacteristic.stopNotifications.mockResolvedValue(undefined)
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const meshtastic = useMeshtastic()

      expect(meshtastic.connected.value).toBe(false)
      expect(typeof meshtastic.connect).toBe('function')
      expect(typeof meshtastic.disconnect).toBe('function')
      expect(typeof meshtastic.send).toBe('function')
      expect(typeof meshtastic.on).toBe('function')
      expect(typeof meshtastic.off).toBe('function')
      expect(typeof meshtastic.isSupported).toBe('function')
    })

    it('should check if Web Bluetooth is supported', () => {
      const meshtastic = useMeshtastic()
      expect(meshtastic.isSupported()).toBe(true)

      // Temporarily remove bluetooth from navigator
      const originalBluetooth = global.navigator.bluetooth
      delete global.navigator.bluetooth
      expect(meshtastic.isSupported()).toBe(false)

      // Restore bluetooth
      global.navigator.bluetooth = originalBluetooth
    })
  })

  describe('Connection', () => {
    it('should connect to Meshtastic device', async () => {
      const meshtastic = useMeshtastic()
      await meshtastic.connect()

      expect(mockBluetooth.requestDevice).toHaveBeenCalled()
      expect(mockGatt.connect).toHaveBeenCalled()
      expect(mockGattServer.getPrimaryService).toHaveBeenCalledWith('6ba1b218-15a8-461f-9fa8-5dcae273eafd')
      expect(mockService.getCharacteristic).toHaveBeenCalledWith('8ba2bcc2-ee02-4a55-a531-c525c5e454d5')
      expect(mockCharacteristic.startNotifications).toHaveBeenCalled()
      expect(mockCharacteristic.addEventListener).toHaveBeenCalledWith('characteristicvaluechanged', expect.any(Function))

      expect(meshtastic.connected.value).toBe(true)
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('connected')
    })

    it('should throw error when Web Bluetooth not supported', async () => {
      // Temporarily remove bluetooth from navigator
      const originalBluetooth = global.navigator.bluetooth
      delete global.navigator.bluetooth
      
      const meshtastic = useMeshtastic()

      await expect(meshtastic.connect()).rejects.toThrow('Web Bluetooth API not supported')

      // Restore bluetooth
      global.navigator.bluetooth = originalBluetooth
    })

    it('should handle connection errors', async () => {
      mockBluetooth.requestDevice.mockRejectedValue(new Error('Connection failed'))
      const meshtastic = useMeshtastic()

      await expect(meshtastic.connect()).rejects.toThrow('Connection failed')
      expect(meshtastic.connected.value).toBe(false)
    })

    it('should handle GATT connection errors', async () => {
      mockGatt.connect.mockRejectedValue(new Error('GATT connection failed'))
      const meshtastic = useMeshtastic()

      await expect(meshtastic.connect()).rejects.toThrow('GATT connection failed')
      expect(meshtastic.connected.value).toBe(false)
    })
  })

  describe('Disconnection', () => {
    let meshtastic
    beforeEach(async () => {
      meshtastic = useMeshtastic()
      await meshtastic.connect() // Establish connection first
      vi.clearAllMocks() // Clear mocks after connection setup
    })

    it('should disconnect cleanly', async () => {
      await meshtastic.disconnect()

      expect(mockCharacteristic.stopNotifications).toHaveBeenCalled()
      expect(mockCharacteristic.removeEventListener).toHaveBeenCalledWith('characteristicvaluechanged', expect.any(Function))

      expect(meshtastic.connected.value).toBe(false)
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('disconnected')
    })

    it('should handle disconnection errors gracefully', async () => {
      mockCharacteristic.stopNotifications.mockRejectedValue(new Error('Stop notifications failed'))

      await meshtastic.disconnect()

      expect(meshtastic.connected.value).toBe(false)
    })

    it('should handle disconnection when not connected', async () => {
      // Disconnect twice - second time should not throw
      await meshtastic.disconnect()
      vi.clearAllMocks()
      await meshtastic.disconnect()

      expect(mockCharacteristic.stopNotifications).not.toHaveBeenCalled()
      expect(meshtastic.connected.value).toBe(false)
    })
  })

  describe('Message Sending', () => {
    let meshtastic
    beforeEach(async () => {
      meshtastic = useMeshtastic()
      await meshtastic.connect()
      vi.clearAllMocks()
    })

    it('should send messages when connected', async () => {
      const message = { type: 'test', data: 'hello' }
      const mockValue = new TextEncoder().encode(JSON.stringify(message))
      const result = await meshtastic.send(message)

      expect(mockCharacteristic.writeValue).toHaveBeenCalledWith(mockValue)
      expect(result).toBe(true)
    })

    it('should return false when not connected', async () => {
      await meshtastic.disconnect()
      const message = { type: 'test', data: 'hello' }
      const result = await meshtastic.send(message)

      expect(result).toBe(false)
    })

    it('should handle send errors', async () => {
      mockCharacteristic.writeValue.mockRejectedValue(new Error('Write failed'))
      const message = { type: 'test', data: 'hello' }
      const result = await meshtastic.send(message)

      expect(result).toBe(false)
    })
  })

  describe('Message Reception', () => {
    let meshtastic
    let notificationHandler
    beforeEach(async () => {
      meshtastic = useMeshtastic()
      await meshtastic.connect()
      notificationHandler = mockCharacteristic.addEventListener.mock.calls
        .find(call => call[0] === 'characteristicvaluechanged')[1]
      vi.clearAllMocks()
    })

    it('should handle incoming notifications', () => {
      const mockMessage = { type: 'test', data: 'hello' }
      const mockValue = new TextEncoder().encode(JSON.stringify(mockMessage))
      const event = { target: { value: new DataView(mockValue.buffer) } }
      
      notificationHandler(event)

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('message', mockMessage)
    })

    it('should handle notification parsing errors', () => {
      const mockValue = new TextEncoder().encode('not json')
      const event = { target: { value: new DataView(mockValue.buffer) } }
      
      notificationHandler(event)

      // The composable logs errors but doesn't emit them for JSON parsing errors
    })
  })

  describe('Disconnect Handling', () => {
    let meshtastic
    let disconnectHandler
    beforeEach(async () => {
      // Ensure navigator.bluetooth is still available
      Object.defineProperty(global, 'navigator', {
        value: { bluetooth: mockBluetooth },
        writable: true
      })
      
      meshtastic = useMeshtastic()
      await meshtastic.connect()
      disconnectHandler = mockDevice.addEventListener.mock.calls
        .find(call => call[0] === 'gattserverdisconnected')[1]
      vi.clearAllMocks()
    })

    it('should handle GATT server disconnection', () => {
      disconnectHandler()

      expect(meshtastic.connected.value).toBe(false)
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('disconnected')
    })
  })

  describe('Event Emitter Integration', () => {
    it('should return event emitter methods', () => {
      const meshtastic = useMeshtastic()
      expect(meshtastic.on).toBe(mockEventEmitter.on)
      expect(meshtastic.off).toBe(mockEventEmitter.off)
    })
  })
})
