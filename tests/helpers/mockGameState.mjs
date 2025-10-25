/**
 * Test helper utilities for creating mock game state
 */

export function createMockTeam(id = 1, overrides = {}) {
  return {
    id,
    name: `Team ${id}`,
    color: id === 1 ? '#ef4444' : '#3b82f6',
    score: 0,
    ...overrides
  }
}

export function createMockCapturePoint(name = 'Alpha', overrides = {}) {
  return {
    id: name,
    teamId: null,
    position: null,
    staticPosition: null,
    useStaticPosition: false,
    lastCaptureTime: null,
    totalCaptures: 0,
    ...overrides
  }
}

export function createMockNode(name = 'Alpha', overrides = {}) {
  return {
    id: name,
    mode: 'capture-point',
    position: null,
    status: 'online',
    lastSeen: Date.now(),
    ...overrides
  }
}

export function createMockGameState(overrides = {}) {
  return {
    nodeMode: 'capture-point',
    localNodeName: 'Alpha',
    teams: [
      createMockTeam(1, { name: 'Red Team' }),
      createMockTeam(2, { name: 'Blue Team' })
    ],
    capturePoints: [createMockCapturePoint('Alpha')],
    nodes: [createMockNode('Alpha')],
    networkMode: 'wifi',
    adminConnected: false,
    gameActive: false,
    gameStartTime: null,
    scoringInterval: null,
    ...overrides
  }
}

export function createMockGPSPosition(overrides = {}) {
  return {
    lat: 37.7749,
    lon: -122.4194,
    altitude: 10,
    speed: 0,
    ...overrides
  }
}

