/**
 * Factory functions for creating game entities
 */

export function createTeam(id, name, color) {
  return {
    id,
    name,
    color,
    score: 0
  }
}

export function createCapturePoint(name, position = null) {
  return {
    id: name, // NATO name IS the ID (Alpha, Bravo, etc.)
    teamId: null,
    position,
    lastCaptureTime: null,
    totalCaptures: 0
  }
}

export function createNode(name, mode = 'capture-point') {
  return {
    id: name, // NATO name IS the ID (Alpha, Bravo, HQ Command, etc.)
    mode,
    position: null,
    status: 'online',
    lastSeen: Date.now()
  }
}

