<template>
  <ErrorBoundary component-name="Capture Point">
    <div class="h-screen bg-slate-950 text-slate-100 font-mono p-4 overflow-hidden flex flex-col">
      <!-- Tactical grid background -->
      <div class="fixed inset-0 opacity-10 pointer-events-none" style="background-image: linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px); background-size: 20px 20px;"/>
      
      <div class="relative z-10 flex flex-col h-full min-h-0">
      <!-- Connection overlay -->
      <ConnectionStatus />
      
      <!-- Status bar -->
      <div class="flex-none mb-4">
        <StatusIndicator />
      </div>
      
      <!-- Main content area -->
      <div class="flex-1 flex gap-4 min-h-0">
        <!-- Left: Map -->
        <div class="flex-1 min-h-0">
          <TacticalMap />
        </div>
        
        <!-- Right: Controls & Score -->
        <div class="w-96 flex flex-col gap-4 flex-shrink-0">
          <!-- Capture buttons -->
          <div class="flex-1 flex items-center justify-center">
            <div class="w-full">
              <CaptureButtons />
            </div>
          </div>
          
          <!-- Score display -->
          <div class="flex-none">
            <LocalScore />
          </div>
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
import { GPS_UPDATE_FREQUENCY } from '~/config/game-config.mjs'
import ErrorBoundary from '~/components/ErrorBoundary.vue'
import StatusIndicator from '~/components/capture/StatusIndicator.vue'
import CaptureButtons from '~/components/capture/CaptureButtons.vue'
import LocalScore from '~/components/capture/LocalScore.vue'
import ConnectionStatus from '~/components/capture/ConnectionStatus.vue'
import TacticalMap from '~/components/capture/TacticalMap.vue'

defineOptions({
  name: 'CapturePointPage'
})

const gameState = useGameState()
const gameSync = useGameSync()
const gps = useGPS()

// Provide gameSync to child components
provide('gameSync', gameSync)

let gpsUpdateInterval = null

onMounted(async () => {
  // Initialize game state
  await gameState.initialize({ nodeMode: 'capture-point' })
  
  // Don't call initializeGame() - that's admin-only
  // State will be synced from admin server when WebSocket connects
  
  // Initialize network sync
  console.log('[Capture Point] Initializing network sync...')
  gameSync.initialize()
  
  // Start GPS tracking (will be used as fallback or if not using static position)
  if (gps.isSupported()) {
    gps.startSerial().catch(() => {
      console.log('Serial GPS not available, using browser geolocation')
    })
  }
  
  // Send position updates periodically
  gpsUpdateInterval = setInterval(() => {
    if (!gameState.localNodeName) return
    
    // Check if we should use static position
    const cp = gameState.localCapturePoint
    const useStatic = cp && cp.useStaticPosition && cp.staticPosition
    
    let positionToUse = null
    
    if (useStatic) {
      // Use static position
      positionToUse = cp.staticPosition
      console.log('[Capture Point] Using static position')
    } else if (gps.position.value) {
      // Use GPS position
      positionToUse = gps.position.value
    }
    
    if (positionToUse) {
      gameSync.sendPositionUpdate(positionToUse)
      
      // Update local node and capture point position
      gameState.updateNodePosition(gameState.localNodeName, positionToUse)
    }
  }, GPS_UPDATE_FREQUENCY)
})

onUnmounted(() => {
  if (gpsUpdateInterval) {
    clearInterval(gpsUpdateInterval)
  }
  gps.stop()
})

// Set page title
useHead({
  title: 'BattleMesh - Capture Point',
  meta: [
    { name: 'description', content: 'Airsoft capture point interface' }
  ]
})
</script>

