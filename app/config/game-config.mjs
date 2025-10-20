/**
 * Game configuration constants
 */

export const DEFAULT_TEAMS = [
  { id: 1, name: 'Red Team', color: '#ef4444' },
  { id: 2, name: 'Blue Team', color: '#3b82f6' }
]

export const POINTS_PER_CAPTURE = 10
export const POINTS_PER_SECOND = 1

export const GPS_UPDATE_FREQUENCY = 1000
export const CAPTURE_COOLDOWN = 1000

export const RECONNECT_DELAY_BASE = 1000
export const RECONNECT_DELAY_MAX = 30000

