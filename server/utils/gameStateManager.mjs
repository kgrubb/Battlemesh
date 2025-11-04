import { promises as fs } from 'fs'
import { DEFAULT_TEAMS } from '~/config/game-config.mjs'
import { publishState } from './sseBus.mjs'
import { calculateScores, awardCaptureBonus, resetScores } from '~/utils/scoring.mjs'
import * as validation from '~/utils/validation.mjs'
import * as models from '~/utils/models.mjs'

/**
 * Server-side game state manager with file persistence
 * Singleton pattern - maintains authoritative game state
 */

const STATE_FILE = process.env.STATE_FILE_PATH || '.battlemesh-state.json'
const LOAD_PREVIOUS_STATE = process.env.LOAD_PREVIOUS_STATE !== 'false'

// Default teams configuration (configurable via DEFAULT_TEAMS env var)
const getDefaultTeams = () => DEFAULT_TEAMS.map(team => ({ ...team, score: 0 }))

// Log admin PIN info at startup
function logAdminPin() {
  const adminPin = process.env.TEST_ADMIN_PIN
  if (adminPin) {
    console.log('[StateManager] Admin PIN required:', adminPin)
  } else {
    console.log('[StateManager] Admin PIN: any 6-digit number (dev mode)')
  }
}

// Generate or read Admin PIN at startup
const ADMIN_PIN = (() => {
  const fromEnv = process.env.TEST_ADMIN_PIN
  const pin = fromEnv && /^\d{6}$/.test(fromEnv)
    ? fromEnv
    : String(Math.floor(100000 + Math.random() * 900000))
  console.log('[StateManager] Admin PIN required:', pin)
  return pin
})()

export function getAdminPin() {
  return ADMIN_PIN
}

// Server-side scoring interval (runs independently of client connections)
let scoringInterval = null
let lastSavedPersistent = null

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
        
        // If game was active when server last ran, restart scoring interval
        if (gameState.gameActive) {
          console.log('[StateManager] Game was active, restarting scoring interval')
          startScoringInterval()
        }
        
        logAdminPin()
        return gameState
      }
    } catch (err) {
      console.warn('[StateManager] Could not load state:', err.message)
    }
  }

  console.log('[StateManager] ✓ Initialized with default teams')
  
  logAdminPin()
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
  
  const wasGameActive = gameState.gameActive
  gameState = { ...gameState, ...persistentUpdates }
  
  // Manage server-side scoring interval
  // Start scoring when game becomes active, stop when it becomes inactive
  if (updates.gameActive !== undefined) {
    if (updates.gameActive && !wasGameActive) {
      startScoringInterval()
    } else if (!updates.gameActive && wasGameActive) {
      stopScoringInterval()
    }
  }
  
  immediate ? saveState() : scheduleSave()
  return gameState
}

/**
 * Start server-side scoring interval
 */
function startScoringInterval() {
  if (scoringInterval) {
    console.log('[StateManager] Scoring interval already running')
    return
  }
  
  console.log('[StateManager] Starting server-side scoring interval')
  scoringInterval = setInterval(async () => {
      if (gameState.gameActive && gameState.capturePoints.length > 0) {
      // Calculate scores using current server state
      calculateScores(gameState)
      // Do not persist on every tick; SSE will broadcast separately
    }
  }, 1000)
}

/**
 * Stop server-side scoring interval
 */
function stopScoringInterval() {
  if (scoringInterval) {
    console.log('[StateManager] Stopping server-side scoring interval')
    clearInterval(scoringInterval)
    scoringInterval = null
  }
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
    // Skip write if unchanged
    const serialized = JSON.stringify(persistentState)
    if (lastSavedPersistent === serialized) {
      return
    }
    lastSavedPersistent = serialized
    
    await fs.writeFile(STATE_FILE, JSON.stringify(persistentState, null, 2), 'utf-8')
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
  publishState(gameState)
  
  return activity
}

/**
 * Clear activity feed
 */
export function clearActivityFeed() {
  gameState.activityFeed = []
  scheduleSave()
  publishState(gameState)
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
 * NOTE: Capture points are now persistent during active games - we keep them even when nodes disconnect
 * so that scoring can continue based on who holds each point. Only remove them when game is inactive.
 */
export function releaseNatoName(natoName) {
  delete gameState.assignedNatoNames[natoName]
  
  // Update node status to offline
  const node = gameState.nodes.find(n => n.id === natoName)
  if (node) {
    node.status = 'offline'
  }
  
  // Only keep capture point if game is active (for continuous scoring)
  // Remove it if game is inactive (cleanup)
  if (gameState.gameActive) {
    const cp = gameState.capturePoints.find(cp => cp.id === natoName)
    if (cp) {
      console.log('[StateManager] Node disconnected, keeping capture point state for active game:', natoName, '(held by team:', cp.teamId || 'none', ')')
    }
  } else {
    // Game is not active - remove capture point (cleanup)
    const cpIndex = gameState.capturePoints.findIndex(cp => cp.id === natoName)
    if (cpIndex !== -1) {
      gameState.capturePoints.splice(cpIndex, 1)
      console.log('[StateManager] ✓ Removed capture point (game inactive):', natoName)
    }
  }
  
  // Don't save capture points - they are ephemeral in terms of file persistence
  // but we keep them in memory during active games
}

/**
 * Get all assigned NATO names
 */
export function getAssignedNatoNames() {
  return gameState.assignedNatoNames
}

/**
 * Server-side command handlers
 */

/**
 * Start the game
 */
export function startGame() {
  if (gameState.gameActive) {
    console.log('[StateManager] Game already active')
    return gameState
  }
  
  gameState.gameActive = true
  gameState.gameStartTime = Date.now()
  
  startScoringInterval()
  addActivity('game-start', 'Mission started')
  saveState()
  publishState(gameState)
  
  console.log('[StateManager] ✓ Game started')
  return gameState
}

/**
 * Stop the game
 */
export function stopGame() {
  if (!gameState.gameActive) {
    console.log('[StateManager] Game already inactive')
    return gameState
  }
  
  gameState.gameActive = false
  gameState.gameStartTime = null
  
  stopScoringInterval()
  
  gameState.capturePoints.forEach(cp => {
    cp.teamId = null
    cp.lastCaptureTime = null
  })
  
  addActivity('game-stop', 'Mission stopped')
  saveState()
  publishState(gameState)
  
  console.log('[StateManager] ✓ Game stopped')
  return gameState
}

/**
 * Reset game scores and captures
 */
export async function resetGame() {
  resetScores(gameState)
  
  gameState.capturePoints.forEach(cp => {
    cp.teamId = null
    cp.lastCaptureTime = null
    cp.totalCaptures = 0
  })
  
  addActivity('game-reset', 'Scores reset')
  saveState()
  publishState(gameState)
  
  console.log('[StateManager] ✓ Game reset')
  return gameState
}

/**
 * Add a new team
 */
export async function addTeam(name, color) {
  const nameValidation = validation.validateTeamName(name)
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error)
  }
  
  const colorValidation = validation.validateTeamColor(color)
  if (!colorValidation.valid) {
    throw new Error(colorValidation.error)
  }
  
  // Generate numeric ID
  const id = gameState.teams.length > 0 ? Math.max(...gameState.teams.map(t => t.id)) + 1 : 1
  
  const team = models.createTeam(id, nameValidation.value, colorValidation.value)
  gameState.teams.push(team)
  
  addActivity('team-added', `Team ${team.name} added`, team.id)
  saveState()
  publishState(gameState)
  
  console.log('[StateManager] ✓ Team added:', team.name)
  return team
}

/**
 * Update team properties
 */
export async function updateTeam(teamId, updates) {
  const team = gameState.teams.find(t => t.id === teamId)
  if (!team) {
    throw new Error(`Team with ID ${teamId} not found`)
  }
  
  if (updates.name !== undefined) {
    const nameValidation = validation.validateTeamName(updates.name)
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error)
    }
    team.name = nameValidation.value
  }
  
  if (updates.color !== undefined) {
    const colorValidation = validation.validateTeamColor(updates.color)
    if (!colorValidation.valid) {
      throw new Error(colorValidation.error)
    }
    team.color = colorValidation.value
  }
  
  saveState()
  publishState(gameState)
  
  console.log('[StateManager] ✓ Team updated:', team.name)
  return team
}

/**
 * Remove a team
 */
export function removeTeam(teamId) {
  const team = gameState.teams.find(t => t.id === teamId)
  if (!team) {
    throw new Error(`Team with ID ${teamId} not found`)
  }
  
  if (gameState.teams.length <= 2) {
    throw new Error('Must have at least 2 teams')
  }
  
  gameState.capturePoints.forEach(cp => {
    if (cp.teamId === teamId) {
      cp.teamId = null
      cp.lastCaptureTime = null
    }
  })
  
  gameState.teams = gameState.teams.filter(t => t.id !== teamId)
  
  addActivity('team-removed', `Team ${team.name} removed`)
  saveState()
  publishState(gameState)
  
  console.log('[StateManager] ✓ Team removed:', team.name)
  return gameState
}

/**
 * Handle capture event from a capture point
 */
export async function handleCaptureEvent(natoName, teamId) {
  const teamValidation = validation.validateTeamId(teamId, gameState.teams)
  if (!teamValidation.valid) {
    throw new Error(teamValidation.error)
  }
  
  const capturePoint = gameState.capturePoints.find(cp => cp.id === natoName)
  if (!capturePoint) {
    throw new Error(`Capture point ${natoName} not found`)
  }
  
  const previousTeam = capturePoint.teamId
  const validatedTeamId = teamValidation.value
  
  if (previousTeam === validatedTeamId) {
    return gameState
  }
  
  // Rate limiting: prevent rapid captures (< 500ms)
  if (capturePoint.lastCaptureTime && Date.now() - capturePoint.lastCaptureTime < 500) {
    console.warn('[StateManager] Capture too rapid, ignoring:', natoName)
    return gameState
  }
  
  capturePoint.teamId = validatedTeamId
  capturePoint.lastCaptureTime = Date.now()
  capturePoint.totalCaptures++
  
  const team = gameState.teams.find(t => t.id === validatedTeamId)
  if (team) {
    awardCaptureBonus(team)
  }
  
  addActivity('capture', `${natoName} captured by ${team?.name || 'Unknown'}`, validatedTeamId)
  scheduleSave()
  publishState(gameState)
  
  console.log('[StateManager] ✓ Capture event processed:', natoName, '→ Team', validatedTeamId)
  return gameState
}

/**
 * Update capture point position (GPS or static)
 */
export async function updateCapturePointPosition(natoName, position, type = 'gps') {
  const validationResult = validation.validateGPSCoordinate(position.lat, position.lon)
  if (!validationResult.valid) {
    if (type === 'static') {
      throw new Error(validationResult.error)
    } else {
      console.warn('[StateManager] Invalid GPS coordinates:', validationResult.error)
      return gameState
    }
  }
  
  const capturePoint = gameState.capturePoints.find(cp => cp.id === natoName)
  if (!capturePoint) {
    const newCp = models.createCapturePoint(natoName)
    newCp.position = validationResult.value
    if (type === 'static') {
      newCp.staticPosition = validationResult.value
      newCp.useStaticPosition = true
    }
    gameState.capturePoints.push(newCp)
    scheduleSave()
    publishState(gameState)
    return gameState
  }
  
  if (type === 'static') {
    capturePoint.staticPosition = validationResult.value
    // When setting a static position, automatically enable it and update the displayed position
    capturePoint.useStaticPosition = true
    capturePoint.position = validationResult.value
  } else if (!capturePoint.useStaticPosition || !capturePoint.staticPosition) {
    // Only update position from GPS if static position is not being used
    capturePoint.position = validationResult.value
  }
  
  scheduleSave()
  publishState(gameState)
  
  return gameState
}

/**
 * Toggle capture point position source (GPS vs static)
 */
export function toggleCapturePointPositionSource(natoName) {
  const capturePoint = gameState.capturePoints.find(cp => cp.id === natoName)
  if (!capturePoint) {
    throw new Error(`Capture point ${natoName} not found`)
  }
  
  if (!capturePoint.staticPosition) {
    throw new Error(`No static position set for ${natoName}`)
  }
  
  capturePoint.useStaticPosition = !capturePoint.useStaticPosition
  
  if (capturePoint.useStaticPosition) {
    capturePoint.position = capturePoint.staticPosition
  } else {
    // Fall back to GPS if available (but we don't have GPS here, so keep static)
    // This is handled by updateCapturePointPosition when GPS updates come in
    // For now, if toggling off static but no GPS, keep static
    if (!capturePoint.position || capturePoint.position === capturePoint.staticPosition) {
      capturePoint.useStaticPosition = true
      console.warn('[StateManager] No GPS available, keeping static position for', natoName)
      return gameState
    }
  }
  
  scheduleSave()
  publishState(gameState)
  
  console.log('[StateManager] ✓ Toggled position source for', natoName, '→', capturePoint.useStaticPosition ? 'static' : 'GPS')
  return gameState
}

