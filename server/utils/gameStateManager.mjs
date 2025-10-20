import { promises as fs } from 'fs'

/**
 * Server-side game state manager with file persistence
 * Singleton pattern - maintains authoritative game state
 */

const STATE_FILE = process.env.STATE_FILE_PATH || '.battlemesh-state.json'
const LOAD_PREVIOUS_STATE = process.env.LOAD_PREVIOUS_STATE === 'true'

// Default teams configuration
const DEFAULT_TEAMS = [
  { id: 1, name: 'Red Team', color: '#ef4444', score: 0 },
  { id: 2, name: 'Blue Team', color: '#3b82f6', score: 0 }
]

// In-memory game state (authoritative source)
let gameState = {
  teams: [...DEFAULT_TEAMS],
  capturePoints: [],
  nodes: [],
  gameActive: false,
  gameStartTime: null,
  activityFeed: [],
  initialized: false
}

// Debounce state saves to avoid excessive file I/O
let saveTimeout = null
const SAVE_DEBOUNCE_MS = 100 // Reduced from 1000ms to 100ms to prevent data loss on quick reloads

/**
 * Initialize state manager - load from file or start fresh
 */
export async function initialize() {
  if (gameState.initialized) {
    return gameState
  }

  if (LOAD_PREVIOUS_STATE) {
    try {
      const loaded = await loadState()
      if (loaded) {
        console.log('[StateManager] ✓ Loaded state:', loaded.teams.length, 'teams,', loaded.capturePoints.length, 'points')
        gameState = { ...loaded, initialized: true }
        return gameState
      }
    } catch (err) {
      console.warn('[StateManager] Could not load state:', err.message)
    }
  }

  console.log('[StateManager] ✓ Initialized with default teams')
  gameState.teams = [...DEFAULT_TEAMS]
  gameState.initialized = true
  return gameState
}

/**
 * Get current game state
 */
export function getState() {
  return gameState
}

/**
 * Update game state and persist to file
 */
export function updateState(updates, immediate = false) {
  gameState = {
    ...gameState,
    ...updates
  }
  
  // Save immediately for critical updates (captures), otherwise debounce
  if (immediate) {
    saveState()
  } else {
    scheduleSave()
  }
  
  return gameState
}

/**
 * Load state from file
 */
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    
    // Validate structure
    if (!parsed.teams || !Array.isArray(parsed.teams)) {
      throw new Error('Invalid state file structure')
    }
    
    // Ensure nodes array exists (but starts empty - connections are ephemeral)
    if (!parsed.nodes) {
      parsed.nodes = []
    }
    
    return parsed
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

/**
 * Save state to file (debounced)
 */
function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  saveTimeout = setTimeout(async () => {
    await saveState()
    saveTimeout = null
  }, SAVE_DEBOUNCE_MS)
}

/**
 * Save state to file immediately
 */
export async function saveState() {
  try {
    // Persist teams, capture points (with NATO names), game status, activity feed
    const persistentState = {
      teams: gameState.teams,
      capturePoints: gameState.capturePoints, // Full capture points (id is NATO name)
      gameActive: gameState.gameActive,
      gameStartTime: gameState.gameStartTime,
      activityFeed: gameState.activityFeed
      // Nodes are NOT persisted (ephemeral WebSocket connections)
    }
    
    const data = JSON.stringify(persistentState, null, 2)
    await fs.writeFile(STATE_FILE, data, 'utf-8')
    console.log('[StateManager] ✓ State saved to file')
  } catch (err) {
    console.error('[StateManager] ✗ Error saving state:', err)
  }
}

/**
 * Clear state and delete file
 */
export async function clearState() {
  gameState = {
    teams: [...DEFAULT_TEAMS],
    capturePoints: [],
    nodes: [],
    gameActive: false,
    gameStartTime: null,
    activityFeed: [],
    initialized: true
  }
  
  try {
    await fs.unlink(STATE_FILE)
    console.log('[StateManager] ✓ State file deleted')
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('[StateManager] ✗ Error deleting state file:', err)
    }
  }
  
  return gameState
}

/**
 * Add activity to feed
 */
export function addActivity(type, message, teamId = null) {
  const activity = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    message,
    teamId,
    timestamp: Date.now()
  }
  
  gameState.activityFeed.unshift(activity)
  scheduleSave()
  
  return activity
}

/**
 * Clear activity feed
 */
export function clearActivityFeed() {
  gameState.activityFeed = []
  scheduleSave()
}

