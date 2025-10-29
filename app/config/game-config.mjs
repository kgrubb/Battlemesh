/**
 * Game configuration constants
 * All values can be overridden via environment variables
 */

// Team configuration
const DEFAULT_TEAMS_ENV = process.env.DEFAULT_TEAMS
export const DEFAULT_TEAMS = DEFAULT_TEAMS_ENV 
  ? JSON.parse(DEFAULT_TEAMS_ENV)
  : [
      { id: 1, name: 'Red Team', color: '#ef4444' },
      { id: 2, name: 'Blue Team', color: '#3b82f6' }
    ]

// Scoring configuration
export const POINTS_PER_CAPTURE = parseInt(process.env.POINTS_PER_CAPTURE || '10', 10)
export const POINTS_PER_SECOND = parseFloat(process.env.POINTS_PER_SECOND || '1')

// Timing configuration
export const GPS_UPDATE_FREQUENCY = parseInt(process.env.GPS_UPDATE_FREQUENCY || '1000', 10)
export const CAPTURE_COOLDOWN = parseInt(process.env.CAPTURE_COOLDOWN || '1000', 10)

// Reconnection configuration
export const RECONNECT_DELAY_BASE = parseInt(process.env.RECONNECT_DELAY_BASE || '1000', 10)
export const RECONNECT_DELAY_MAX = parseInt(process.env.RECONNECT_DELAY_MAX || '30000', 10)

