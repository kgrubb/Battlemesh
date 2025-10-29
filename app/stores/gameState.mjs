import { defineStore } from 'pinia'
import { createTeam, createCapturePoint, createNode } from '~/utils/models.mjs'
import { DEFAULT_TEAMS } from '../config/game-config.mjs'
import { calculateScores, awardCaptureBonus, resetScores } from '~/utils/scoring.mjs'
import { validateTeamName, validateTeamColor, validateGPSCoordinate, validateTeamId } from '~/utils/validation.mjs'

export const useGameState = defineStore('gameState', {
  state: () => ({
    nodeMode: 'capture-point',
    localNodeName: null, // NATO name (Alpha, Bravo, HQ Command, etc.) - this is our ID
    teams: [],
    capturePoints: [],
    nodes: [],
    networkMode: 'wifi',
    adminConnected: false,
    gameActive: false,
    gameStartTime: null,
    scoringInterval: null
  }),
  
  getters: {
    isAdmin(state) {
      return state.nodeMode === 'admin'
    },
    
    localCapturePoint(state) {
      // Direct lookup by NATO name (node.id === cp.id)
      return state.capturePoints.find(cp => cp.id === state.localNodeName)
    },
    
    onlineNodes(state) {
      return state.nodes.filter(n => n.status === 'online')
    }
  },
  
  actions: {
    async initialize() {
      // Determine mode from URL path (always check URL to ensure correct mode)
      // Skip URL detection in test environment to allow manual mode setting
      if (import.meta.client && !import.meta.env.VITEST) {
        const path = window.location.pathname
        this.nodeMode = path.includes('/admin') ? 'admin' : 'capture-point'
        console.log('[GameState] Detected mode from URL:', this.nodeMode, 'for path:', path)
      } else if (!import.meta.env.VITEST) {
        this.nodeMode = 'capture-point'
      }
      
      if (import.meta.client) {
        if (this.nodeMode === 'admin') {
          this.localNodeName = 'HQ Command'
          console.log('[GameState] Admin mode - set localNodeName to HQ Command')
        } else {
          this.localNodeName = this.getStoredNatoName()
          if (!this.localNodeName) {
            console.log('[GameState] No NATO name found, will request from admin')
          }
        }
      }
    },

    // Simplified NATO name management
    getStoredNatoName() {
      return import.meta.client ? sessionStorage.getItem('battlemesh-nato-name') : null
    },

    updateNatoName(natoName) {
      if (import.meta.client) {
        sessionStorage.setItem('battlemesh-nato-name', natoName)
        this.localNodeName = natoName
      }
    },

    clearNatoName() {
      if (import.meta.client) {
        sessionStorage.removeItem('battlemesh-nato-name')
        this.localNodeName = null
      }
    },
    
    // Admin-only actions
    initializeGame(config = {}) {
      if (!this.isAdmin) return
      
      // Setup teams
      this.teams = (config.teams || DEFAULT_TEAMS).map(t => 
        createTeam(t.id, t.name, t.color)
      )
      
      // Create capture points for each node
      this.capturePoints = []
      
      // Add local admin node (no capture point - admin is not capturable)
      const adminNode = createNode('HQ Command', 'admin')
      this.nodes = [adminNode]
      this.localNodeName = 'HQ Command'
      
      this.gameActive = false
      this.gameStartTime = null
    },
    
    startGame() {
      if (!this.isAdmin) return
      
      this.gameActive = true
      this.gameStartTime = Date.now()
      
      // Start scoring interval
      this.startScoringInterval()
    },
    
    stopGame() {
      if (!this.isAdmin) return
      
      this.gameActive = false
      this.gameStartTime = null
      this.stopScoringInterval()
      
      // Reset all capture points to neutral when game stops
      this.capturePoints.forEach(cp => {
        cp.teamId = null
        cp.lastCaptureTime = null
      })
      
      // Persist to server
      this.persistToServer()
    },
    
    handleNodeDisconnect(natoName) {
      if (!this.isAdmin) return
      
      // Mark node as offline but keep in list
      const node = this.nodes.find(n => n.id === natoName)
      if (node) {
        node.status = 'offline'
      }
      
      // Optionally: if game is active and all nodes disconnect, pause the game
      const activeNodes = this.nodes.filter(n => n.status === 'online' && n.mode === 'capture-point')
      if (this.gameActive && activeNodes.length === 0) {
        console.warn('[GameState] ⚠ All capture nodes offline - consider pausing game')
      }
      this.persistToServer()
    },
    
    resetGame() {
      if (!this.isAdmin) return
      
      resetScores(this.$state)
      
      this.capturePoints.forEach(cp => {
        cp.teamId = null
        cp.lastCaptureTime = null
        cp.totalCaptures = 0
      })
      
      this.gameActive = false
      this.gameStartTime = null
      this.stopScoringInterval()
      
      // Persist to server
      this.persistToServer()
    },
    
    addTeam(name, color) {
      if (!this.isAdmin) return
      
      // Validate inputs
      const nameValidation = validateTeamName(name)
      if (!nameValidation.valid) {
        console.error('[GameState] Invalid team name:', nameValidation.error)
        throw new Error(nameValidation.error)
      }
      
      const colorValidation = validateTeamColor(color)
      if (!colorValidation.valid) {
        console.error('[GameState] Invalid team color:', colorValidation.error)
        throw new Error(colorValidation.error)
      }
      
      // Generate numeric ID
      const id = this.teams.length > 0 ? Math.max(...this.teams.map(t => t.id)) + 1 : 1
      
      const team = createTeam(id, nameValidation.value, colorValidation.value)
      this.teams.push(team)
      
      // Persist to server
      this.persistToServer()
      
      return team
    },
    
    removeTeam(teamId) {
      if (!this.isAdmin) return
      
      // Clear any capture points held by this team
      this.capturePoints.forEach(cp => {
        if (cp.teamId === teamId) {
          cp.teamId = null
          cp.lastCaptureTime = null
        }
      })
      
      this.teams = this.teams.filter(t => t.id !== teamId)
      
      // Persist to server
      this.persistToServer()
    },
    
    addNode(natoName, mode = 'capture-point') {
      if (!this.isAdmin) return
      
      // Check if node already exists by NATO name
      const existingNode = this.nodes.find(n => n.id === natoName)
      if (existingNode) {
        existingNode.status = 'online'
        existingNode.lastSeen = Date.now()
        return natoName
      }
      
      // Check if capture point already exists (from persisted state)
      const existingCapturePoint = this.capturePoints.find(cp => cp.id === natoName)
      
      // Create node with NATO name as ID
      const node = createNode(natoName, mode)
      this.nodes.push(node)
      
      // Only create capture point for capture-point nodes (not admin)
      // AND only if it doesn't already exist from persisted state
      if (mode === 'capture-point' && !existingCapturePoint) {
        const capturePoint = createCapturePoint(natoName)
        this.capturePoints.push(capturePoint)
        this.persistToServer()
      }
      
      return natoName
    },
    
    removeNode(natoName) {
      if (!this.isAdmin) return
      
      // Remove both node and capture point (for explicit removal)
      this.nodes = this.nodes.filter(n => n.id !== natoName)
      this.capturePoints = this.capturePoints.filter(cp => cp.id !== natoName)
      
      this.persistToServer()
    },
    
    updateNodePosition(natoName, position) {
      this._updatePosition(natoName, position, 'gps')
    },
    
    setStaticPosition(natoName, position) {
      if (!this.isAdmin) return
      this._updatePosition(natoName, position, 'static')
      this.persistToServer()
    },
    
    _updatePosition(natoName, position, type) {
      const validation = validateGPSCoordinate(position.lat, position.lon)
      if (!validation.valid) {
        const errorMsg = `Invalid GPS coordinates: ${validation.error}`
        if (type === 'static') {
          console.error('[GameState]', errorMsg)
          throw new Error(validation.error)
        } else {
          console.warn('[GameState]', errorMsg)
          return
        }
      }
      
      // Update node position
      const node = this.nodes.find(n => n.id === natoName)
      if (node) {
        node.position = validation.value
        node.lastSeen = Date.now()
      } else if (natoName === this.localNodeName) {
        const localNode = createNode(natoName, this.nodeMode)
        localNode.position = validation.value
        this.nodes.push(localNode)
      }
      
      // Find or create capture point (only for capture-point nodes)
      let cp = this.capturePoints.find(cp => cp.id === natoName)
      if (!cp) {
        // Only create capture point if this is a capture-point node
        const node = this.nodes.find(n => n.id === natoName)
        if (node && node.mode === 'capture-point') {
          cp = createCapturePoint(natoName)
          this.capturePoints.push(cp)
        } else if (this.isAdmin) {
          // In admin mode, create both node and capture point if they don't exist
          // This allows setting static positions for nodes that haven't connected yet
          const newNode = createNode(natoName, 'capture-point')
          this.nodes.push(newNode)
          cp = createCapturePoint(natoName)
          this.capturePoints.push(cp)
        } else {
          // This is an admin node or other non-capture-point node, skip capture point creation
          return
        }
      }
      
      // Update position based on type
      if (type === 'static') {
        cp.staticPosition = validation.value
        if (!cp.position) cp.position = validation.value
      } else if (!cp.useStaticPosition || !cp.staticPosition) {
        cp.position = validation.value
      }
    },
    
    togglePositionSource(natoName) {
      if (!this.isAdmin) return
      
      const cp = this.capturePoints.find(cp => cp.id === natoName)
      if (!cp) {
        console.warn('[GameState] Capture point not found:', natoName)
        return
      }
      
      // Can only toggle if both GPS and static positions exist
      const node = this.nodes.find(n => n.id === natoName)
      if (!cp.staticPosition) {
        console.warn('[GameState] No static position set for', natoName)
        return
      }
      
      // Toggle the flag
      cp.useStaticPosition = !cp.useStaticPosition
      
      // Update position based on source
      if (cp.useStaticPosition) {
        cp.position = cp.staticPosition
      } else {
        // Fall back to GPS position if available
        if (node && node.position) {
          cp.position = node.position
        } else {
          // If no GPS, keep using static
          cp.useStaticPosition = true
          console.warn('[GameState] No GPS available, keeping static position for', natoName)
          return
        }
      }
      
      this.persistToServer()
    },
    
    handleCaptureEvent(natoName, teamId) {
      if (!this.isAdmin) return
      
      // Validate team ID
      const teamValidation = validateTeamId(teamId, this.teams)
      if (!teamValidation.valid) {
        console.error('[GameState] Invalid team ID:', teamValidation.error)
        return
      }
      
      const capturePoint = this.capturePoints.find(cp => cp.id === natoName)
      if (!capturePoint) {
        console.warn('[GameState] Capture point not found:', natoName)
        return
      }
      
      const previousTeam = capturePoint.teamId
      
      // Only process if team is changing
      if (previousTeam === teamId) {
        return
      }
      
      // Rate limiting: prevent rapid captures (< 500ms)
      if (capturePoint.lastCaptureTime && Date.now() - capturePoint.lastCaptureTime < 500) {
        console.warn('[GameState] Capture too rapid, ignoring')
        return
      }
      
      capturePoint.teamId = teamId
      capturePoint.lastCaptureTime = Date.now()
      capturePoint.totalCaptures++
      
      // Award capture bonus
      const team = this.teams.find(t => t.id === teamId)
      if (team) {
        awardCaptureBonus(team)
      }
      
      this.persistToServer()
    },
    
    // Capture node actions
    captureForTeam(teamId) {
      const cp = this.localCapturePoint
      if (!cp) {
        console.warn('[GameState] No local capture point found')
        return
      }
      
      // Optimistically update local state for immediate UI feedback
      const captureTimestamp = Date.now()
      cp.teamId = teamId
      cp.lastCaptureTime = captureTimestamp
      cp.totalCaptures++
      
      // Event will be sent to admin by useGameSync
      return {
        type: 'capture-event',
        natoName: this.localNodeName,
        teamId,
        timestamp: captureTimestamp
      }
    },
    
    syncFromServer(serverState) {
      if (serverState.teams) this.teams = serverState.teams
      if (serverState.capturePoints) this.capturePoints = serverState.capturePoints
      if (serverState.gameActive !== undefined) this.gameActive = serverState.gameActive
      if (serverState.gameStartTime) this.gameStartTime = serverState.gameStartTime
      
      if (serverState.nodes) {
        const serverNodeIds = new Set(serverState.nodes.map(n => n.id))
        
        this.nodes = this.nodes.filter(n => serverNodeIds.has(n.id))
        
        serverState.nodes.forEach(serverNode => {
          const existing = this.nodes.find(n => n.id === serverNode.id)
          if (!existing) {
            this.nodes.push(serverNode)
          } else {
            existing.status = serverNode.status
            existing.lastSeen = serverNode.lastSeen
          }
        })
      }
      
      if (this.gameActive && this.isAdmin) {
        this.startScoringInterval()
      }
    },
    
    syncFromAdmin(state) {
      this.teams = state.teams || this.teams
      this.gameActive = state.isActive ?? this.gameActive
      this.gameStartTime = state.startTime || this.gameStartTime
      
      // Sync nodes to get position information
      if (state.nodes) {
        this.nodes = state.nodes
      }
      
      if (state.capturePoints) {
        const localCp = this.localCapturePoint
        const localCaptureTime = localCp?.lastCaptureTime || 0
        
        this.capturePoints = state.capturePoints
        
        if (this.gameActive && localCp && localCaptureTime) {
          const updatedLocalCp = this.localCapturePoint
          if (updatedLocalCp && localCaptureTime > (updatedLocalCp.lastCaptureTime || 0)) {
            updatedLocalCp.teamId = localCp.teamId
            updatedLocalCp.lastCaptureTime = localCp.lastCaptureTime
            updatedLocalCp.totalCaptures = localCp.totalCaptures
          }
        }
      }
      
      this.adminConnected = true
    },
    
    // Shared actions
    switchNetworkMode(mode) {
      if (mode === 'wifi' || mode === 'meshtastic') {
        this.networkMode = mode
      }
    },
    
    startScoringInterval() {
      if (this.scoringInterval) {
        return
      }
      this.scoringInterval = setInterval(() => {
        if (this.gameActive) {
          calculateScores(this.$state)
        }
      }, 1000)
    },
    
    stopScoringInterval() {
      if (this.scoringInterval) {
        clearInterval(this.scoringInterval)
        this.scoringInterval = null
      }
    },
    
    persistToServer() {
      // Trigger server state persistence via event
      // Skip in test environment
      if (this.isAdmin && typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
        const event = new CustomEvent('persist-game-state')
        window.dispatchEvent(event)
      }
    },
    
    getFullState() {
      return {
        teams: this.teams,
        capturePoints: this.capturePoints,
        nodes: this.nodes,
        isActive: this.gameActive,
        startTime: this.gameStartTime
      }
    }
  }
})

