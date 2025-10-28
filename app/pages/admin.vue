<template>
  <ErrorBoundary component-name="Admin Control">
    <div class="h-screen bg-slate-950 text-slate-100 font-mono p-4 overflow-hidden flex flex-col">
      <!-- Tactical grid background -->
      <div class="fixed inset-0 opacity-10 pointer-events-none" style="background-image: linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px); background-size: 20px 20px;"/>
      
      <div class="relative z-10 w-full flex-1 flex flex-col min-h-0">
      <!-- Mission Control Header -->
      <div class="mb-4 flex-none">
        <AdminDashboard />
      </div>
      
      <!-- Main layout -->
      <div class="flex gap-4 flex-1 min-h-0">
        <!-- Left: Scoreboard & Activity Feed -->
        <div class="w-96 flex flex-col gap-4 min-h-0 flex-shrink-0">
          <div class="flex-1 min-h-0">
            <ScoreBoard />
          </div>
          <div class="flex-none" style="height: 280px;">
            <ActivityFeed ref="activityFeed" />
          </div>
        </div>
        
        <!-- Center: Map (takes remaining space) -->
        <div class="flex-1 min-h-0">
          <MapView />
        </div>
        
        <!-- Right: Node Manager, Team Config -->
        <div class="w-96 flex flex-col gap-4 overflow-y-auto min-h-0 flex-shrink-0">
          <NodeManager />
          <TeamConfig />
        </div>
      </div>
    </div>
    </div>
  </ErrorBoundary>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'
import { useGameSync } from '~/composables/useGameSync.mjs'
import { useGPS } from '~/composables/useGPS.mjs'
import ErrorBoundary from '~/components/ErrorBoundary.vue'
import AdminDashboard from '~/components/admin/AdminDashboard.vue'
import ActivityFeed from '~/components/admin/ActivityFeed.vue'
import ScoreBoard from '~/components/admin/ScoreBoard.vue'
import MapView from '~/components/admin/MapView.vue'
import NodeManager from '~/components/admin/NodeManager.vue'
import TeamConfig from '~/components/admin/TeamConfig.vue'

defineOptions({
  name: 'AdminPage'
})

const gameState = useGameState()
const gameSync = useGameSync()
const gps = useGPS()
const activityFeed = ref(null)

// Provide gameSync to child components
provide('gameSync', gameSync)

// Keyboard shortcuts
const handleKeyDown = (event) => {
  // Ignore if typing in an input
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return
  }
  
  switch (event.key.toLowerCase()) {
    case ' ': // Space bar - Start/Stop
      event.preventDefault()
      if (gameState.gameActive) {
        gameState.stopGame()
      } else {
        gameState.startGame()
      }
      break
    case 'r': // R - Reset
      event.preventDefault()
      if (confirm('Reset all scores and captures to zero?')) {
        gameState.resetGame()
      }
      break
    case 'c': // C - Center map
      event.preventDefault()
      // Will trigger via CENTER button click simulation
      document.querySelector('button:has-text("CENTER")')?.click()
      break
  }
}

onMounted(async () => {
  // Initialize game state with server-provided node ID
  await gameState.initialize()
  
  // DON'T call initializeGame() yet - wait for server state first
  
  // Set up state listener BEFORE connecting
  let hasReceivedServerState = false
  let stateRequestTimeout = null
  
  gameSync.wsClient.on('server-state', (data) => {
    if (data.state) {
      console.log('[Admin] ✓ Received server state:', data.state.teams?.length, 'teams,', data.state.capturePoints?.length, 'points')
      
      if (stateRequestTimeout) {
        clearTimeout(stateRequestTimeout)
        stateRequestTimeout = null
      }
      
      // Always sync from server state
      if (data.state.teams && data.state.teams.length > 0) {
        gameState.syncFromServer(data.state)
        hasReceivedServerState = true
      } else {
        // Server has empty state, initialize with defaults
        console.log('[Admin] ✓ Initializing with default teams')
        gameState.initializeGame()
        hasReceivedServerState = true
        
        // Persist defaults to server
        setTimeout(() => {
          const state = gameState.getFullState()
          gameSync.wsClient.send({
            type: 'server-state-update',
            updates: {
              teams: state.teams,
              capturePoints: state.capturePoints,
              nodes: state.nodes,
              gameActive: state.isActive,
              gameStartTime: state.startTime
            },
            timestamp: Date.now()
          })
        }, 100)
      }
    }
  })
  
  // Set up connected listener BEFORE connecting
  gameSync.wsClient.on('connected', () => {
    gameSync.wsClient.send({
      type: 'server-state-request',
      timestamp: Date.now()
    })
    
    // Fallback: if no response after 1 second, initialize with defaults
    stateRequestTimeout = setTimeout(() => {
      if (!hasReceivedServerState) {
        console.log('[Admin] ✓ Initializing with default teams (no server response)')
        gameState.initializeGame()
      }
    }, 1000)
  })
  
  // NOW initialize network sync (after listeners are set up)
  gameSync.initialize()
  
  // Start GPS tracking
  if (gps.isSupported()) {
    gps.startSerial().catch(() => {
      console.log('Serial GPS not available, using browser geolocation')
    })
  }
  
  // Watch GPS position and send updates
  watch(() => gps.position.value, (position) => {
    if (position && gameState.localNodeName) {
      gameState.updateNodePosition(gameState.localNodeName, position)
    }
  })
  
  // Add keyboard shortcut listener
  window.addEventListener('keydown', handleKeyDown)
  
  // Listen for persist events from gameState
  window.addEventListener('persist-game-state', () => {
    const state = gameState.getFullState()
    gameSync.wsClient.send({
      type: 'server-state-update',
      updates: {
        teams: state.teams,
        capturePoints: state.capturePoints,
        nodes: state.nodes,
        gameActive: state.isActive,
        gameStartTime: state.startTime
      },
      timestamp: Date.now()
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// Set page title
useHead({
  title: 'BattleMesh - Admin Control',
  meta: [
    { name: 'description', content: 'Airsoft capture point admin control panel' }
  ]
})
</script>

