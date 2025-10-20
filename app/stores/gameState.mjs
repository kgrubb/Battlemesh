import { defineStore } from 'pinia'
import { createTeam, createCapturePoint, createNode } from '~/utils/models.mjs'
import { DEFAULT_TEAMS } from '~/config/game-config.mjs'
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
    },
    
    teamById: (state) => (teamId) => {
      return state.teams.find(t => t.id === teamId)
    }
  },
  
  actions: {
    async initialize(config) {
      this.nodeMode = config.nodeMode || 'capture-point'
      
      // Get persistent NATO name from server (non-blocking on failure)
      if (import.meta.client) {
        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 500))
        const natoFetch = fetch('/api/nato-name')
          .then(res => res.json())
          .then(data => data.natoName)
          .catch(() => null)
        
        this.localNodeName = await Promise.race([natoFetch, timeout])
        
        if (this.localNodeName) {
          console.log('[GameState] ✓ Node:', this.localNodeName)
        }
      }
      
      console.log('[GameState] ✓ Initialized as', this.nodeMode)
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
      
      console.log('[GameState] ✓ Game initialized -', this.teams.length, 'teams')
    },
    
    startGame() {
      if (!this.isAdmin) return
      
      this.gameActive = true
      this.gameStartTime = Date.now()
      
      // Start scoring interval
      this.startScoringInterval()
      
      console.log('[GameState] ✓ Game started')
    },
    
    stopGame() {
      if (!this.isAdmin) return
      
      this.gameActive = false
      this.gameStartTime = null // Reset clock
      this.stopScoringInterval()
      
      // Reset all capture points to neutral when game stops
      this.capturePoints.forEach(cp => {
        cp.teamId = null
        cp.lastCaptureTime = null
      })
      
      // Persist to server
      this.persistToServer()
      
      console.log('[GameState] ✓ Game stopped - points reset, clock cleared')
    },
    
    handleNodeDisconnect(natoName) {
      if (!this.isAdmin) return
      
      // Mark node as offline but keep in list
      const node = this.nodes.find(n => n.id === natoName)
      if (node) {
        node.status = 'offline'
        console.log('[GameState] ✗ Node disconnected:', natoName)
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
      
      console.log('[GameState] ✓ Scores reset, game stopped')
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
      
      console.log('[GameState] ✓ Team added:', nameValidation.value)
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
        console.log('[GameState] ✓ Node added:', natoName)
      }
      
      return natoName
    },
    
    removeNode(natoName) {
      if (!this.isAdmin) return
      
      // Remove both node and capture point (for explicit removal)
      this.nodes = this.nodes.filter(n => n.id !== natoName)
      this.capturePoints = this.capturePoints.filter(cp => cp.id !== natoName)
      
      this.persistToServer()
      
      console.log('[GameState] ✓ Node removed:', natoName)
    },
    
    updateNodePosition(natoName, position) {
      // Validate GPS coordinates
      const validation = validateGPSCoordinate(position.lat, position.lon)
      if (!validation.valid) {
        console.warn('[GameState] Invalid GPS coordinates:', validation.error)
        return
      }
      
      // Update node position (if node exists)
      const node = this.nodes.find(n => n.id === natoName)
      if (node) {
        node.position = validation.value
        node.lastSeen = Date.now()
      } else if (natoName === this.localNodeName) {
        // On capture nodes, create local node entry if it doesn't exist
        const localNode = createNode(natoName, this.nodeMode)
        localNode.position = validation.value
        this.nodes.push(localNode)
      }
      
      // Also update the capture point position (same NATO name)
      const cp = this.capturePoints.find(cp => cp.id === natoName)
      if (cp) {
        cp.position = validation.value
      }
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
        const bonus = awardCaptureBonus(team)
        console.log('[GameState] ✓', natoName, 'captured by', team.name, '→ +' + bonus, 'points')
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
      
      console.log('[CapturePoint] ✓ Sending capture request:', teamId)
      
      // Event will be sent to admin by useGameSync
      return {
        type: 'capture-event',
        natoName: this.localNodeName,
        teamId,
        timestamp: captureTimestamp
      }
    },
    
    syncFromServer(serverState) {
      // Sync from authoritative server state (includes activity feed)
      if (serverState.teams) this.teams = serverState.teams
      if (serverState.capturePoints) this.capturePoints = serverState.capturePoints
      if (serverState.gameActive !== undefined) this.gameActive = serverState.gameActive
      if (serverState.gameStartTime) this.gameStartTime = serverState.gameStartTime
      
      // Nodes from server state represent currently connected nodes
      if (serverState.nodes && serverState.nodes.length > 0) {
        // Merge with existing nodes to preserve any local node data
        const serverNodeIds = new Set(serverState.nodes.map(n => n.id))
        
        // Keep existing nodes that are in server list
        this.nodes = this.nodes.filter(n => serverNodeIds.has(n.id))
        
        // Add new nodes from server
        serverState.nodes.forEach(serverNode => {
          const existing = this.nodes.find(n => n.id === serverNode.id)
          if (!existing) {
            this.nodes.push(serverNode)
          } else {
            // Update status
            existing.status = serverNode.status
            existing.lastSeen = serverNode.lastSeen
          }
        })
      }
      
      // If game was active when state was saved, restart scoring interval
      if (this.gameActive && this.isAdmin) {
        this.startScoringInterval()
      }
      
      console.log('[GameState] ✓ Synced from server -', this.teams.length, 'teams,', this.capturePoints.length, 'points,', this.nodes.length, 'nodes')
    },
    
    syncFromAdmin(state) {
      // Capture node receiving state from admin
      console.log('[GameState] syncFromAdmin - received state with', state.capturePoints?.length, 'capture points')
      console.log('[GameState] Received capturePoints:', state.capturePoints?.map(cp => ({ id: cp.id, teamId: cp.teamId })))
      console.log('[GameState] My localNodeName:', this.localNodeName)
      
      this.teams = state.teams || this.teams
      this.gameActive = state.isActive ?? this.gameActive
      this.gameStartTime = state.startTime || this.gameStartTime
      
      // Receive ALL capture points (for map display)
      if (state.capturePoints) {
        // Save local capture point's optimistic state BEFORE updating
        const localCp = this.localCapturePoint
        const localCaptureTime = localCp?.lastCaptureTime || 0
        
        console.log('[GameState] Local CP BEFORE sync:', localCp?.id, 'teamId:', localCp?.teamId, 'lastCapture:', localCaptureTime)
        
        // Update all capture points
        this.capturePoints = state.capturePoints
        
        console.log('[GameState] Local CP AFTER assignment:', this.localCapturePoint?.id, 'teamId:', this.localCapturePoint?.teamId)
        
        // Only keep optimistic update if:
        // 1. Game is still active (not stopped/reset)
        // 2. Local capture is more recent than admin's data
        if (this.gameActive && localCp && localCaptureTime) {
          const updatedLocalCp = this.localCapturePoint
          if (updatedLocalCp && localCaptureTime > (updatedLocalCp.lastCaptureTime || 0)) {
            console.log('[GameState] Applying optimistic update - local is newer')
            updatedLocalCp.teamId = localCp.teamId
            updatedLocalCp.lastCaptureTime = localCp.lastCaptureTime
            updatedLocalCp.totalCaptures = localCp.totalCaptures
          }
        }
        
        console.log('[GameState] FINAL Local CP after sync:', this.localCapturePoint?.id, 'teamId:', this.localCapturePoint?.teamId)
      }
      
      this.adminConnected = true
    },
    
    // Shared actions
    switchNetworkMode(mode) {
      if (mode === 'wifi' || mode === 'meshtastic') {
        this.networkMode = mode
        console.log('[GameState] ✓ Network mode:', mode)
      }
    },
    
    startScoringInterval() {
      if (this.scoringInterval) {
        console.log('[GameState] Scoring interval already running')
        return
      }
      
      console.log('[GameState] ✓ Scoring interval started')
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

