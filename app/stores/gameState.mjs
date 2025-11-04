import { defineStore } from 'pinia'
import { createNode, createTeam } from '~/utils/models.mjs'
import { DEFAULT_TEAMS } from '../config/game-config.mjs'

export const useGameState = defineStore('gameState', {
  state: () => ({
    nodeMode: 'capture-point',
    localNodeName: null, // NATO name (Alpha, Bravo, HQ Command, etc.) - this is our ID
    teams: [],
    capturePoints: [],
    nodes: [],
    activityFeed: [],
    networkMode: 'wifi',
    adminConnected: false,
    gameActive: false,
    gameStartTime: null
  }),
  
  getters: {
    isAdmin(state) {
      return state.nodeMode === 'admin'
    },
    
    localCapturePoint(state) {
      return state.capturePoints.find(cp => cp.id === state.localNodeName)
    },
    
    onlineNodes(state) {
      return state.nodes.filter(n => n.status === 'online')
    }
  },
  
  actions: {
    async initialize() {
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
    
    initializeGame(config = {}) {
      if (!this.isAdmin) return
      
      // Setup teams
      this.teams = (config.teams || DEFAULT_TEAMS).map(t => 
        createTeam(t.id, t.name, t.color)
      )
      
      // Create capture points for each node
      this.capturePoints = []
      
      // Ensure local admin node exists (but don't overwrite if it already exists)
      const existingAdminNode = this.nodes.find(n => n.id === 'HQ Command' && n.mode === 'admin')
      if (!existingAdminNode) {
        // Only add admin node if it doesn't already exist
        const adminNode = createNode('HQ Command', 'admin')
        this.nodes.push(adminNode)
      } else {
        // Update existing admin node status
        existingAdminNode.status = 'online'
        existingAdminNode.lastSeen = Date.now()
      }
      
      this.localNodeName = 'HQ Command'
      this.gameActive = false
      this.gameStartTime = null
    },
    
    startGame() {
      if (!this.isAdmin) return null
      return {
        type: 'start-game-command',
        timestamp: Date.now()
      }
    },
    
    stopGame() {
      if (!this.isAdmin) return null
      return {
        type: 'stop-game-command',
        timestamp: Date.now()
      }
    },
    
    handleNodeDisconnect(natoName) {
      const node = this.nodes.find(n => n.id === natoName)
      if (node) {
        node.status = 'offline'
      }
      
      // Optionally: if game is active and all nodes disconnect, log warning
      const activeNodes = this.nodes.filter(n => n.status === 'online' && n.mode === 'capture-point')
      if (this.gameActive && activeNodes.length === 0) {
        console.warn('[GameState] ⚠ All capture nodes offline - consider pausing game')
      }
    },
    
    resetGame() {
      if (!this.isAdmin) return null
      return {
        type: 'reset-game-command',
        timestamp: Date.now()
      }
    },
    
    addTeam(name, color) {
      if (!this.isAdmin) return null
      return {
        type: 'add-team-command',
        name,
        color,
        timestamp: Date.now()
      }
    },
    
    updateTeam(teamId, updates) {
      if (!this.isAdmin) return null
      return {
        type: 'update-team-command',
        teamId,
        updates,
        timestamp: Date.now()
      }
    },
    
    removeTeam(teamId) {
      if (!this.isAdmin) return null
      return {
        type: 'remove-team-command',
        teamId,
        timestamp: Date.now()
      }
    },
    
    addNode(natoName, mode = 'capture-point') {
      let node = this.nodes.find(n => n.id === natoName)
      if (!node) {
        node = createNode(natoName, mode)
        this.nodes.push(node)
      }
      node.status = 'online'
      node.lastSeen = Date.now()
      if (node.id === 'HQ Command') {
        node.mode = 'admin'
      }
      return natoName
    },
    
    removeNode(natoName) {
      const node = this.nodes.find(n => n.id === natoName)
      if (node) {
        node.status = 'offline'
      }
    },
    
    updateNodePosition(natoName, position) {
      if (this.isAdmin) {
        return {
          type: 'update-position-command',
          natoName,
          position,
          timestamp: Date.now()
        }
      }
      return {
        type: 'position-update',
        natoName: this.localNodeName,
        position,
        timestamp: Date.now()
      }
    },
    
    setStaticPosition(natoName, position) {
      if (!this.isAdmin) return null
      return {
        type: 'set-static-position-command',
        natoName,
        position,
        timestamp: Date.now()
      }
    },
    
    togglePositionSource(natoName) {
      if (!this.isAdmin) return null
      return {
        type: 'toggle-position-source-command',
        natoName,
        timestamp: Date.now()
      }
    },
    
    captureForTeam(teamId) {
      return {
        type: 'capture-event',
        natoName: this.localNodeName,
        teamId,
        timestamp: Date.now()
      }
    },
    
    syncFromServer(serverState) {
      if (serverState.teams) this.teams = serverState.teams
      if (serverState.capturePoints) this.capturePoints = serverState.capturePoints
      if (serverState.gameActive !== undefined) this.gameActive = serverState.gameActive
      if (serverState.gameStartTime) this.gameStartTime = serverState.gameStartTime
      if (serverState.activityFeed) this.activityFeed = serverState.activityFeed
      
      if (serverState.nodes && serverState.nodes.length) {
        // Preserve admin node (HQ Command) - don't remove it when syncing from server
        const adminNode = this.nodes.find(n => n.id === 'HQ Command' && n.mode === 'admin')
        
        const serverNodeIds = new Set(serverState.nodes.map(n => n.id))
        
        // Filter out nodes that aren't in server state, but keep admin node
        this.nodes = this.nodes.filter(n => 
          serverNodeIds.has(n.id) || (n.id === 'HQ Command' && n.mode === 'admin')
        )
        
        // Add or update nodes from server (but skip admin node - we manage it locally)
        serverState.nodes.forEach(serverNode => {
          if (serverNode.id === 'HQ Command' && serverNode.mode === 'admin') {
            return // Don't sync admin node from server - we manage it locally
          }
          
          const existing = this.nodes.find(n => n.id === serverNode.id)
          if (!existing) {
            this.nodes.push(serverNode)
          } else {
            existing.status = serverNode.status
            existing.lastSeen = serverNode.lastSeen
          }
        })
        
        // Ensure admin node exists if we're in admin mode
        if (this.isAdmin && !adminNode) {
          this.nodes.push(createNode('HQ Command', 'admin'))
        } else if (adminNode) {
          adminNode.status = 'online'
          adminNode.lastSeen = Date.now()
        }
      }
    },
    
    syncFromAdmin(state) {
      this.teams = state.teams || this.teams
      this.gameActive = state.gameActive ?? this.gameActive
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
    }
  }
})

