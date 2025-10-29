<template>
  <ErrorBoundary component-name="Capture Point">
    <div class="h-screen bg-slate-950 text-slate-100 font-mono p-1 lg:p-4 overflow-hidden flex flex-col w-full">
      <!-- Tactical grid background -->
      <div class="fixed inset-0 opacity-10 pointer-events-none" style="background-image: linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px); background-size: 20px 20px;"/>
      
      <div class="relative z-10 flex flex-col h-full min-h-0">
      <!-- Connection overlay -->
      <ConnectionStatus />
      
      <!-- Status bar -->
      <div class="flex-none mb-2 lg:mb-4">
        <StatusIndicator />
      </div>
      
      <!-- Main content area -->
      <div class="flex-1 mobile-grid lg:flex lg:flex-row gap-2 lg:gap-4 min-h-0">
        <!-- Map - responsive sizing -->
        <div class="map-area lg:flex-1 min-h-0">
          <TacticalMap />
        </div>
        
        <!-- Controls & Score - responsive sizing -->
        <div class="controls-area lg:w-96 lg:flex lg:flex-col lg:gap-4">
          <!-- Mobile: responsive layout -->
          <div class="mobile-controls-layout lg:flex lg:flex-col lg:flex-1 lg:items-center lg:justify-center h-full">
            <!-- Capture buttons -->
            <div class="flex-1 lg:w-full">
              <CaptureButtons />
            </div>
            
            <!-- Score display -->
            <div class="flex-shrink-0 lg:flex-none">
              <LocalScore />
            </div>
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
import { GPS_UPDATE_FREQUENCY } from '../config/game-config.mjs'
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
  // Check for reset parameter
  if (import.meta.client) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('reset') === '1') {
      console.log('[Capture Point] Reset parameter detected, clearing NATO name')
      gameState.clearNatoName()
      // Remove reset parameter from URL
      const newUrl = new URL(window.location)
      newUrl.searchParams.delete('reset')
      window.history.replaceState({}, '', newUrl)
    }
  }
  
  // Initialize game state
  await gameState.initialize()
  
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

<style scoped>
/* Mobile landscape optimizations */
@media screen and (max-height: 500px) and (orientation: landscape) {
  .h-screen {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height for mobile browsers */
    height: -webkit-fill-available; /* Safari fallback */
  }
}

/* Ensure no horizontal scroll on mobile */
@media screen and (max-width: 1024px) {
  .overflow-hidden {
    overflow-x: hidden;
  }
}

/* Touch-friendly button sizing */
@media screen and (max-width: 1024px) {
  button {
    min-height: 44px; /* iOS recommended touch target size */
  }
}

/* Safari-specific full screen handling */
@supports (-webkit-touch-callout: none) {
  .h-screen {
    height: -webkit-fill-available;
  }
}

/* Ensure content fills safe area */
.h-screen {
  height: 100vh;
  height: 100dvh;
  height: -webkit-fill-available;
}

/* Remove any potential margins/padding that could cause white bars */
.h-screen {
  margin: 0;
  padding: 0;
}

/* Ensure background covers entire screen including safe areas */
.bg-slate-950 {
  background-color: #020617 !important;
}

/* Force full width and height */
.w-full {
  width: 100vw !important;
  width: 100% !important;
}

/* Additional Safari fixes for white bars */
@media screen and (max-width: 1024px) {
  .h-screen {
    min-height: 100vh;
    min-height: 100dvh;
    min-height: -webkit-fill-available;
  }
}

/* CSS Grid for mobile layout only */
@media screen and (max-width: 1024px) {
  .mobile-grid {
    display: grid;
    grid-template-rows: 1fr auto;
    height: 100%;
  }
  
  .map-area {
    min-height: 0;
    overflow: hidden;
  }
  
  .controls-area {
    min-height: 0;
    overflow: hidden;
  }
}

/* Portrait mode */
@media screen and (max-width: 1024px) and (orientation: portrait) {
  .mobile-grid {
    grid-template-rows: 1.2fr 1fr;
    gap: 8px;
  }
  
  .mobile-controls-layout {
    flex-direction: row;
    gap: 8px;
  }
}

/* Landscape mode */
@media screen and (max-width: 1024px) and (orientation: landscape) {
  .mobile-grid {
    grid-template-columns: 1.2fr 1fr;
    grid-template-rows: 1fr;
    gap: 8px;
  }
  
  .mobile-controls-layout {
    flex-direction: row;
    gap: 8px;
  }
  
  /* Ensure map doesn't overflow */
  .map-area {
    overflow: hidden;
    max-width: 100%;
  }
  
  /* Ensure controls are fully visible */
  .controls-area {
    overflow: visible;
    min-height: 0;
  }
}
</style>

