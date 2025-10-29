import { promises as fs } from 'fs'
import { DEFAULT_TEAMS } from '~/config/game-config.mjs'

/**
 * Server-side game state manager with file persistence
 * Singleton pattern - maintains authoritative game state
 */

const STATE_FILE = process.env.STATE_FILE_PATH || '.battlemesh-state.json'
const LOAD_PREVIOUS_STATE = process.env.LOAD_PREVIOUS_STATE !== 'false'

// Default teams configuration (configurable via DEFAULT_TEAMS env var)
const getDefaultTeams = () => DEFAULT_TEAMS.map(team => ({ ...team, score: 0 }))

// In-memory game state (authoritative source)
let gameState = {
  teams: [...getDefaultTeams()],
  capturePoints: [],
  nodes: [],
  gameActive: false,
  gameStartTime: null,
  activityFeed: [],
  assignedNatoNames: {},
  initialized: false
}

// Debounce state saves to avoid excessive file I/O
let saveTimeout = null
const SAVE_DEBOUNCE_MS = 100 // Reduced from 1000ms to 100ms to prevent data loss on quick reloads

/**
 * Initialize state manager - load from file or start fresh
 */
export async function initialize() {
  // In test environment, always reset and reload from file to simulate server restart
  if (gameState.initialized && import.meta.env.VITEST) {
    console.log('[StateManager] Test environment detected, resetting and reloading state')
    gameState.initialized = false
  }
  
  if (gameState.initialized) {
    console.log('[StateManager] Already initialized, returning existing state with', gameState.capturePoints.length, 'capture points')
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
  gameState.teams = [...getDefaultTeams()]
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
  // Filter out ephemeral data that shouldn't be persisted
  const persistentUpdates = { ...updates }
  delete persistentUpdates.capturePoints
  delete persistentUpdates.assignedNatoNames
  delete persistentUpdates.nodes
  
  gameState = { ...gameState, ...persistentUpdates }
  immediate ? saveState() : scheduleSave()
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
    
    // Don't load capturePoints or assignedNatoNames - they should be ephemeral
    // Only load persistent data like teams, game state, and activity feed
    return {
      teams: parsed.teams,
      capturePoints: [], // Always start with empty capture points
      nodes: parsed.nodes || [],
      gameActive: parsed.gameActive || false,
      gameStartTime: parsed.gameStartTime || null,
      activityFeed: parsed.activityFeed || [],
      assignedNatoNames: {} // Always start with empty assigned names
    }
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
  if (saveTimeout) clearTimeout(saveTimeout)
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
    const persistentState = {
      teams: gameState.teams,
      // Don't persist capturePoints - they should be ephemeral and only exist when nodes are connected
      gameActive: gameState.gameActive,
      gameStartTime: gameState.gameStartTime,
      activityFeed: gameState.activityFeed,
      // Don't persist assignedNatoNames - they should be ephemeral and only exist when nodes are connected
    }
    
    await fs.writeFile(STATE_FILE, JSON.stringify(persistentState, null, 2), 'utf-8')
    console.log('[StateManager] ✓ State saved to file')
  } catch (err) {
    console.error('[StateManager] ✗ Error saving state:', err)
  }
}

/**
 * Reset the state manager (for development/testing)
 */
export function resetStateManager() {
  gameState = {
    teams: [...getDefaultTeams()],
    capturePoints: [],
    nodes: [],
    gameActive: false,
    gameStartTime: null,
    activityFeed: [],
    assignedNatoNames: {},
    initialized: false
  }
  console.log('[StateManager] ✓ State manager reset')
}

/**
 * Clear state and delete file
 */
export async function clearState() {
  gameState = {
    teams: [...getDefaultTeams()],
    capturePoints: [],
    nodes: [],
    gameActive: false,
    gameStartTime: null,
    activityFeed: [],
    assignedNatoNames: {},
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

/**
 * Assign NATO name to a client and create capture point
 */
export function assignNatoName(natoName) {
  gameState.assignedNatoNames[natoName] = {
    timestamp: Date.now(),
    lastSeen: Date.now()
  }
  
  // Create capture point for this NATO name if it doesn't exist
  const existingCp = gameState.capturePoints.find(cp => cp.id === natoName)
  if (!existingCp) {
    const capturePoint = {
      id: natoName,
      teamId: null,
      position: null,
      staticPosition: null,
      useStaticPosition: false,
      lastCaptureTime: null,
      totalCaptures: 0
    }
    gameState.capturePoints.push(capturePoint)
    console.log('[StateManager] ✓ Created capture point:', natoName)
  }
  
  // Don't save capture points - they are ephemeral
  return natoName
}

/**
 * Update last seen time for a NATO name
 */
export function updateNatoNameLastSeen(natoName) {
  if (gameState.assignedNatoNames[natoName]) {
    gameState.assignedNatoNames[natoName].lastSeen = Date.now()
  }
}

/**
 * Release a NATO name (when client disconnects)
 */
export function releaseNatoName(natoName) {
  delete gameState.assignedNatoNames[natoName]
  
  // Remove capture point for this NATO name
  const cpIndex = gameState.capturePoints.findIndex(cp => cp.id === natoName)
  if (cpIndex !== -1) {
    gameState.capturePoints.splice(cpIndex, 1)
    console.log('[StateManager] ✓ Removed capture point:', natoName)
  }
  
  // Don't save capture points - they are ephemeral
}

/**
 * Get all assigned NATO names
 */
export function getAssignedNatoNames() {
  return gameState.assignedNatoNames
}

