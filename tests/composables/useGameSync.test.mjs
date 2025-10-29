import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue before importing composables
vi.mock('vue', () => ({
  ref: (value) => ({ value }),
  onUnmounted: (fn) => fn()
}))

// Mock dependencies
const mockWsClient = {
  connected: { value: false },
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}
vi.mock('../../app/composables/useWebSocketClient.mjs', () => ({
  useWebSocketClient: () => mockWsClient
}))

const mockMeshtastic = {
  connected: { value: false },
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}
vi.mock('../../app/composables/useMeshtastic.mjs', () => ({
  useMeshtastic: () => mockMeshtastic
}))

const mockGPS = {
  position: { value: null },
  accuracy: { value: null },
  source: { value: null },
  error: { value: null },
  isSupported: vi.fn(() => true),
  startSerial: vi.fn(),
  startBrowserGeolocation: vi.fn(),
  stop: vi.fn()
}
vi.mock('../../app/composables/useGPS.mjs', () => ({
  useGPS: () => mockGPS
}))

const mockGameState = {
  nodeMode: 'capture-point',
  localNodeName: 'ALPHA-1',
  networkMode: 'wifi',
  adminConnected: false,
  nodes: [],
  capturePoints: [],
  teams: [],
  captureForTeam: vi.fn(),
  updateNodePosition: vi.fn(),
  handleCaptureEvent: vi.fn(),
  switchNetworkMode: vi.fn(),
  syncFromAdmin: vi.fn(),
  syncFromServer: vi.fn(),
  addNode: vi.fn(),
  removeNode: vi.fn(),
  handleNodeDisconnect: vi.fn(),
  updateNatoName: vi.fn(),
  getFullState: vi.fn(() => ({ mock: 'state' }))
}
vi.mock('../../app/stores/gameState.mjs', () => ({
  useGameState: () => mockGameState
}))

describe('useGameSync', () => {
  let gameSync
  let useGameSync

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset ref values
    mockWsClient.connected.value = false
    mockMeshtastic.connected.value = false
    mockGPS.position.value = null
    mockGPS.accuracy.value = null
    mockGPS.source.value = null
    mockGPS.error.value = null
    // Reset store values (not refs)
    mockGameState.nodeMode = 'capture-point'
    mockGameState.localNodeName = 'ALPHA-1'
    mockGameState.networkMode = 'wifi'
    mockGameState.adminConnected = false
    mockGameState.nodes = []
    mockGameState.capturePoints = []
    mockGameState.teams = []

    // Dynamic import after mocks are set up
    const module = await import('../../app/composables/useGameSync.mjs')
    useGameSync = module.useGameSync
    gameSync = useGameSync()
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      expect(gameSync.activeNetwork.value).toBeNull()
      expect(typeof gameSync.initialize).toBe('function')
      expect(typeof gameSync.broadcastState).toBe('function')
      expect(typeof gameSync.sendCaptureEvent).toBe('function')
      expect(typeof gameSync.sendPositionUpdate).toBe('function')
      expect(typeof gameSync.switchNetworkMode).toBe('function')
    })
  })

  describe('Initialization', () => {
    it('should connect to WiFi when network mode is wifi', () => {
      mockGameState.networkMode = 'wifi'
      gameSync.initialize()

      expect(mockWsClient.connect).toHaveBeenCalledWith('ALPHA-1', 'capture-point')
      expect(gameSync.activeNetwork.value).toBe('wifi')
    })

    it('should connect to Meshtastic when network mode is meshtastic', async () => {
      mockGameState.networkMode = 'meshtastic'
      await gameSync.initialize()

      expect(mockMeshtastic.connect).toHaveBeenCalled()
      expect(gameSync.activeNetwork.value).toBe('meshtastic')
    })

    it('should fallback to WiFi when Meshtastic connection fails', async () => {
      mockGameState.networkMode = 'meshtastic'
      mockMeshtastic.connect.mockRejectedValueOnce(new Error('Meshtastic failed'))
      await gameSync.initialize()

      expect(mockMeshtastic.connect).toHaveBeenCalled()
      expect(mockWsClient.connect).toHaveBeenCalledWith('ALPHA-1', 'capture-point')
      expect(gameSync.activeNetwork.value).toBe('wifi')
    })

    it('should setup message handlers', () => {
      gameSync.initialize()

      expect(mockWsClient.on).toHaveBeenCalledWith('message', expect.any(Function))
      expect(mockWsClient.on).toHaveBeenCalledWith('connected', expect.any(Function))
      expect(mockWsClient.on).toHaveBeenCalledWith('disconnected', expect.any(Function))
    })
  })

  describe('Message Handling', () => {
    let handleMessage
    beforeEach(() => {
      gameSync.initialize()
      // Get the message handler
      handleMessage = mockWsClient.on.mock.calls
        .find(call => call[0] === 'message')[1]
    })

    describe('Server State Messages', () => {
      it('should sync from server when in admin mode', () => {
        mockGameState.nodeMode = 'admin'
        const serverState = { teams: [], capturePoints: [] }
        handleMessage({ type: 'server-state', state: serverState })
        expect(mockGameState.syncFromServer).toHaveBeenCalledWith(serverState)
      })

      it('should sync from admin when in capture-point mode', () => {
        mockGameState.nodeMode = 'capture-point'
        const adminState = { teams: [], capturePoints: [] }
        handleMessage({ type: 'server-state', state: adminState })
        expect(mockGameState.syncFromAdmin).toHaveBeenCalledWith(adminState)
      })
    })

    describe('State Sync Messages', () => {
      it('should sync from admin when in capture-point mode', () => {
        mockGameState.nodeMode = 'capture-point'
        const state = { teams: [], capturePoints: [] }
        handleMessage({ type: 'state-sync', state })
        expect(mockGameState.syncFromAdmin).toHaveBeenCalledWith(state)
      })

      it('should not sync when in admin mode', () => {
        mockGameState.nodeMode = 'admin'
        const state = { teams: [], capturePoints: [] }
        handleMessage({ type: 'state-sync', state })
        expect(mockGameState.syncFromAdmin).not.toHaveBeenCalled()
      })
    })

    describe('Capture Event Messages', () => {
      it('should handle capture events in admin mode', () => {
        mockGameState.nodeMode = 'admin'
        handleMessage({ type: 'capture-event', natoName: 'ALPHA-1', teamId: 'red' })
        expect(mockGameState.handleCaptureEvent).toHaveBeenCalledWith('ALPHA-1', 'red')
      })

      it('should not handle capture events in capture-point mode', () => {
        mockGameState.nodeMode = 'capture-point'
        handleMessage({ type: 'capture-event', natoName: 'ALPHA-1', teamId: 'red' })
        expect(mockGameState.handleCaptureEvent).not.toHaveBeenCalled()
      })
    })

    describe('Position Update Messages', () => {
      it('should handle position updates in admin mode', () => {
        mockGameState.nodeMode = 'admin'
        const position = { lat: 10, lon: 20 }
        handleMessage({ type: 'position-update', natoName: 'BRAVO-2', position })
        expect(mockGameState.updateNodePosition).toHaveBeenCalledWith('BRAVO-2', position)
      })

      it('should not handle position updates in capture-point mode', () => {
        mockGameState.nodeMode = 'capture-point'
        const position = { lat: 10, lon: 20 }
        handleMessage({ type: 'position-update', natoName: 'BRAVO-2', position })
        expect(mockGameState.updateNodePosition).not.toHaveBeenCalled()
      })
    })

    describe('Node Management Messages', () => {
      it('should handle node-joined messages in admin mode', () => {
        mockGameState.nodeMode = 'admin'
        handleMessage({ type: 'node-joined', natoName: 'CHARLIE-3', mode: 'capture-point' })
        expect(mockGameState.addNode).toHaveBeenCalledWith('CHARLIE-3', 'capture-point')
      })

      it('should handle node-left messages in admin mode', () => {
        mockGameState.nodeMode = 'admin'
        handleMessage({ type: 'node-left', natoName: 'DELTA-4' })
        expect(mockGameState.removeNode).toHaveBeenCalledWith('DELTA-4')
      })

      it('should handle node-disconnect messages in admin mode', () => {
        mockGameState.nodeMode = 'admin'
        handleMessage({ type: 'node-disconnect', natoName: 'ECHO-5' })
        expect(mockGameState.handleNodeDisconnect).toHaveBeenCalledWith('ECHO-5')
      })
    })

    describe('NATO Name Assignment', () => {
      it('should handle NATO name assignment in capture-point mode', () => {
        mockGameState.nodeMode = 'capture-point'
        const natoName = 'FOXTROT-6'
        handleMessage({ type: 'nato-name-assigned', natoName })
        expect(mockGameState.updateNatoName).toHaveBeenCalledWith(natoName)
        expect(mockWsClient.send).toHaveBeenCalledWith({
          type: 'register',
          natoName,
          mode: 'capture-point',
          timestamp: expect.any(Number)
        })
      })

      it('should not handle NATO name assignment in admin mode', () => {
        mockGameState.nodeMode = 'admin'
        const natoName = 'GOLF-7'
        handleMessage({ type: 'nato-name-assigned', natoName })
        expect(mockGameState.updateNatoName).not.toHaveBeenCalled()
      })
    })
  })

  describe('Connection Handlers', () => {
    let connectedHandler
    let disconnectedHandler
    beforeEach(() => {
      gameSync.initialize()
      connectedHandler = mockWsClient.on.mock.calls
        .find(call => call[0] === 'connected')[1]
      disconnectedHandler = mockWsClient.on.mock.calls
        .find(call => call[0] === 'disconnected')[1]
    })

    it('should set adminConnected on WiFi connection', () => {
      mockGameState.nodeMode = 'capture-point'
      connectedHandler()
      expect(mockGameState.adminConnected).toBe(true)
    })

    it('should clear adminConnected on WiFi disconnection in capture-point mode', () => {
      mockGameState.nodeMode = 'capture-point'
      mockGameState.adminConnected = true
      disconnectedHandler()
      expect(mockGameState.adminConnected).toBe(false)
    })

    it('should not clear adminConnected on WiFi disconnection in admin mode', () => {
      mockGameState.nodeMode = 'admin'
      mockGameState.adminConnected = true
      disconnectedHandler()
      expect(mockGameState.adminConnected).toBe(true)
    })
  })

  describe('Broadcasting', () => {
    beforeEach(() => {
      gameSync.initialize()
      mockWsClient.connected.value = true
      gameSync.activeNetwork.value = 'wifi'
      vi.clearAllMocks()
    })

    it('should broadcast state in admin mode', () => {
      mockGameState.nodeMode = 'admin'
      gameSync.broadcastState()

      expect(mockWsClient.send).toHaveBeenCalledWith({
        type: 'state-update',
        state: { mock: 'state' },
        timestamp: expect.any(Number)
      })
    })

    it('should not broadcast state in capture-point mode', () => {
      mockGameState.nodeMode = 'capture-point'
      gameSync.broadcastState()
      expect(mockWsClient.send).not.toHaveBeenCalled()
    })
  })

  describe('Sending Events', () => {
    beforeEach(() => {
      gameSync.initialize()
      mockWsClient.connected.value = true
      gameSync.activeNetwork.value = 'wifi'
      vi.clearAllMocks()
    })

    it('should send capture events', () => {
      const mockEvent = { type: 'capture-event', team: 'red', capturePoint: 'Alpha' }
      mockGameState.captureForTeam.mockReturnValue(mockEvent)
      gameSync.sendCaptureEvent('red')

      expect(mockGameState.captureForTeam).toHaveBeenCalledWith('red')
      expect(mockWsClient.send).toHaveBeenCalledWith(mockEvent)
    })

    it('should handle failed capture event creation', () => {
      mockGameState.captureForTeam.mockReturnValue(null) // Simulate failure
      gameSync.sendCaptureEvent('red')
      expect(mockWsClient.send).not.toHaveBeenCalled()
    })

    it('should send position updates', () => {
      const position = { lat: 10, lon: 20 }
      gameSync.sendPositionUpdate(position)

      expect(mockWsClient.send).toHaveBeenCalledWith({
        type: 'position-update',
        natoName: 'ALPHA-1',
        position,
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Network Switching', () => {
    it('should switch from WiFi to Meshtastic', async () => {
      mockGameState.networkMode = 'wifi'
      gameSync.initialize() // Start in WiFi mode

      await gameSync.switchNetworkMode('meshtastic')

      expect(mockWsClient.disconnect).toHaveBeenCalled()
      expect(mockGameState.switchNetworkMode).toHaveBeenCalledWith('meshtastic')
      expect(mockMeshtastic.connect).toHaveBeenCalled()
      expect(gameSync.activeNetwork.value).toBe('meshtastic')
    })

    it('should switch from Meshtastic to WiFi', async () => {
      mockGameState.networkMode = 'meshtastic'
      await gameSync.initialize() // Start in Meshtastic mode

      await gameSync.switchNetworkMode('wifi')

      expect(mockMeshtastic.disconnect).toHaveBeenCalled()
      expect(mockGameState.switchNetworkMode).toHaveBeenCalledWith('wifi')
      expect(mockWsClient.connect).toHaveBeenCalledWith('ALPHA-1', 'capture-point')
      expect(gameSync.activeNetwork.value).toBe('wifi')
    })
  })
})
