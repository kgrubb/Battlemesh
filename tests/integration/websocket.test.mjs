import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the dependencies
const mockStateManager = {
  initialize: vi.fn().mockResolvedValue({}),
  getState: vi.fn().mockReturnValue({
    teams: [],
    capturePoints: [],
    gameActive: false,
    gameStartTime: null,
    activityFeed: []
  }),
  updateState: vi.fn(),
  addActivity: vi.fn().mockReturnValue({ id: 'activity-1', type: 'test', message: 'test' }),
  clearActivityFeed: vi.fn(),
  clearState: vi.fn().mockResolvedValue({}),
  assignNatoName: vi.fn(),
  updateNatoNameLastSeen: vi.fn(),
  releaseNatoName: vi.fn(),
  getAssignedNatoNames: vi.fn().mockReturnValue({})
}

const mockNodeNames = {
  getNextAvailableNatoName: vi.fn().mockReturnValue('Alpha'),
  markNatoNameAsUsed: vi.fn()
}

// Mock the modules
vi.mock('../../server/utils/gameStateManager.mjs', () => mockStateManager)
vi.mock('../../server/utils/nodeNames.mjs', () => mockNodeNames)

describe('WebSocket Message Handling', () => {
  let mockPeer
  let mockCapturePeer

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create mock peers
    mockPeer = {
      id: 'peer-1',
      send: vi.fn(),
      node: {
        req: { method: 'GET' },
        res: { statusCode: 200, end: vi.fn() }
      }
    }
    
    // mockAdminPeer = {
    //   id: 'admin-peer',
    //   send: vi.fn(),
    //   node: mockPeer.node
    // }
    
    mockCapturePeer = {
      id: 'capture-peer',
      send: vi.fn(),
      node: mockPeer.node
    }
  })

  describe('Message Processing Logic', () => {
    it('should handle admin registration messages', () => {
      const message = {
        type: 'register',
        mode: 'admin',
        natoName: 'HQ Command'
      }
      
      // Simulate message processing
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('admin-registered')
      expect(mockStateManager.getState).toHaveBeenCalled()
    })

    it('should handle capture point registration messages', () => {
      const message = {
        type: 'register',
        mode: 'capture-point',
        natoName: 'Alpha'
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('capture-point-registered')
      expect(mockStateManager.updateNatoNameLastSeen).toHaveBeenCalledWith('Alpha')
    })

    it('should handle NATO name assignment for new capture points', () => {
      const message = {
        type: 'register',
        mode: 'capture-point',
        natoName: null
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('nato-name-assigned')
      expect(mockNodeNames.getNextAvailableNatoName).toHaveBeenCalled()
      expect(mockStateManager.assignNatoName).toHaveBeenCalledWith('Alpha')
    })

    it('should handle capture events', () => {
      const message = {
        type: 'capture-event',
        natoName: 'Alpha',
        teamId: 1,
        timestamp: Date.now()
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('capture-processed')
      expect(result.natoName).toBe('Alpha')
      expect(result.teamId).toBe(1)
    })

    it('should handle position updates', () => {
      const message = {
        type: 'position-update',
        natoName: 'Alpha',
        position: { lat: 37.7749, lon: -122.4194 }
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('position-processed')
      expect(result.natoName).toBe('Alpha')
      expect(result.position).toEqual({ lat: 37.7749, lon: -122.4194 })
    })

    it('should handle state updates from admin', () => {
      const message = {
        type: 'state-update',
        state: { teams: [], capturePoints: [], gameActive: true }
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('state-updated')
      expect(mockStateManager.updateState).toHaveBeenCalled()
    })

    it('should handle server state requests', () => {
      const message = {
        type: 'server-state-request'
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('server-state-response')
      expect(mockStateManager.getState).toHaveBeenCalled()
    })

    it('should handle activity events', () => {
      const message = {
        type: 'activity-event',
        activityType: 'capture',
        message: 'Point captured',
        teamId: 1
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('activity-added')
      expect(mockStateManager.addActivity).toHaveBeenCalledWith('capture', 'Point captured', 1)
    })

    it('should handle heartbeat messages', () => {
      const message = {
        type: 'heartbeat'
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('heartbeat-ack')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', () => {
      const malformedMessage = 'invalid json'
      
      expect(() => {
        processMessage(malformedMessage, mockPeer)
      }).not.toThrow()
    })

    it('should handle unknown message types', () => {
      const message = {
        type: 'unknown-type',
        data: 'test'
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('unknown-message')
    })

    it('should handle missing message data', () => {
      const message = {
        type: 'capture-event'
        // Missing natoName and teamId
      }
      
      const result = processMessage(message, mockPeer)
      
      expect(result.type).toBe('invalid-message')
    })
  })

  describe('Broadcasting Logic', () => {
    it('should broadcast to all connected peers', () => {
      const peers = new Map([
        ['peer-1', { peer: mockPeer, mode: 'capture-point' }],
        ['peer-2', { peer: mockCapturePeer, mode: 'capture-point' }]
      ])
      
      const message = {
        type: 'state-sync',
        state: { teams: [], capturePoints: [], gameActive: true }
      }
      
      broadcastToPeers(message, peers, 'peer-1')
      
      expect(mockCapturePeer.send).toHaveBeenCalledWith(JSON.stringify(message))
      expect(mockPeer.send).not.toHaveBeenCalled() // Excluded sender
    })

    it('should handle peer send errors gracefully', () => {
      const peers = new Map([
        ['peer-1', { peer: mockPeer, mode: 'capture-point' }]
      ])
      
      mockPeer.send.mockImplementation(() => {
        throw new Error('Send failed')
      })
      
      const message = { type: 'test' }
      
      expect(() => {
        broadcastToPeers(message, peers)
      }).not.toThrow()
    })
  })

  describe('Connection Management', () => {
    it('should track peer connections', () => {
      const peers = new Map()
      
      addPeer(peers, mockPeer)
      expect(peers.has('peer-1')).toBe(true)
      
      removePeer(peers, mockPeer)
      expect(peers.has('peer-1')).toBe(false)
    })

    it('should handle peer disconnection cleanup', () => {
      const peers = new Map([
        ['peer-1', { peer: mockPeer, natoName: 'Alpha', mode: 'capture-point' }]
      ])
      
      const result = handlePeerDisconnect(peers, mockPeer)
      
      expect(result.type).toBe('peer-disconnected')
      expect(result.natoName).toBe('Alpha')
      expect(peers.has('peer-1')).toBe(false)
    })
  })

  describe('State Management', () => {
    it('should persist state changes', () => {
      const updates = {
        teams: [{ id: 1, name: 'Red Team', color: '#ef4444', score: 0 }],
        gameActive: true
      }
      
      const result = updateServerState(updates, true)
      
      expect(result.type).toBe('state-updated')
      expect(mockStateManager.updateState).toHaveBeenCalledWith(updates, true)
    })

    it('should handle state clearing', () => {
      const result = clearServerState()
      
      expect(result.type).toBe('state-cleared')
      expect(mockStateManager.clearState).toHaveBeenCalled()
    })
  })
})

// Helper functions to simulate WebSocket handler logic
function processMessage(message, peer) {
  try {
    if (typeof message === 'string') {
      message = JSON.parse(message)
    }
    
    switch (message.type) {
      case 'register':
        if (message.mode === 'admin') {
          mockStateManager.getState()
          return { type: 'admin-registered', peerId: peer.id }
        } else if (message.mode === 'capture-point') {
          if (message.natoName) {
            mockStateManager.updateNatoNameLastSeen(message.natoName)
            return { type: 'capture-point-registered', natoName: message.natoName }
          } else {
            const assignedName = mockNodeNames.getNextAvailableNatoName()
            mockStateManager.assignNatoName(assignedName)
            return { type: 'nato-name-assigned', natoName: assignedName }
          }
        }
        break
        
      case 'capture-event':
        if (message.natoName && message.teamId) {
          return { type: 'capture-processed', natoName: message.natoName, teamId: message.teamId }
        }
        return { type: 'invalid-message' }
        
      case 'position-update':
        if (message.natoName && message.position) {
          return { type: 'position-processed', natoName: message.natoName, position: message.position }
        }
        return { type: 'invalid-message' }
        
      case 'state-update':
        mockStateManager.updateState(message.state)
        return { type: 'state-updated' }
        
      case 'server-state-request':
        mockStateManager.getState()
        return { type: 'server-state-response' }
        
      case 'activity-event':
        mockStateManager.addActivity(message.activityType, message.message, message.teamId)
        return { type: 'activity-added' }
        
      case 'heartbeat':
        return { type: 'heartbeat-ack' }
        
      default:
        return { type: 'unknown-message' }
    }
  } catch (error) {
    return { type: 'parse-error', error: error.message }
  }
}

function broadcastToPeers(message, peers, excludePeerId = null) {
  const messageStr = JSON.stringify(message)
  
  for (const [peerId, peerData] of peers) {
    if (peerId !== excludePeerId) {
      try {
        peerData.peer.send(messageStr)
      } catch (error) {
        // Handle send errors gracefully
        console.error(`Error sending to peer ${peerId}:`, error)
      }
    }
  }
}

function addPeer(peers, peer) {
  peers.set(peer.id, {
    peer,
    natoName: null,
    mode: null,
    lastSeen: Date.now()
  })
}

function removePeer(peers, peer) {
  peers.delete(peer.id)
}

function handlePeerDisconnect(peers, peer) {
  const peerData = peers.get(peer.id)
  if (peerData) {
    peers.delete(peer.id)
    return {
      type: 'peer-disconnected',
      natoName: peerData.natoName,
      mode: peerData.mode
    }
  }
  return { type: 'peer-not-found' }
}

function updateServerState(updates, immediate = false) {
  mockStateManager.updateState(updates, immediate)
  return { type: 'state-updated' }
}

function clearServerState() {
  mockStateManager.clearState()
  return { type: 'state-cleared' }
}
