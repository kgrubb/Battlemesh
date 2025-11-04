<template>
  <div class="bg-tactical-dark border-2 border-slate-700 px-2 lg:px-4 py-2 font-mono flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-0">
    <div class="flex flex-wrap items-center gap-2 lg:gap-4 text-xs">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" :class="adminConnectionClass"/>
        <span :class="adminConnectionTextClass">{{ adminConnectionStatus }}</span>
      </div>
      
      <div class="border-l-2 border-slate-700 pl-2 lg:pl-4">
        <span class="text-slate-400">MODE:</span>
        <span class="text-green-500 ml-1">{{ gameState.networkMode.toUpperCase() }}</span>
      </div>
      
      <div class="border-l-2 border-slate-700 pl-2 lg:pl-4">
        <span class="text-slate-400">POINT:</span>
        <span class="text-green-500 ml-1">{{ displayName }}</span>
      </div>
      
      <div class="border-l-2 border-slate-700 pl-2 lg:pl-4">
        <span :class="gpsStatus.class">{{ gpsStatus.text }}</span>
      </div>
    </div>
    
    <div class="flex items-center justify-between lg:justify-end gap-2">
      <div v-if="gameState.gameActive" class="flex items-center gap-2 text-green-500">
        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
        <span class="text-xs">GAME ACTIVE</span>
      </div>
      <div v-else class="text-xs text-slate-500">
        STANDBY
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'

const gameState = useGameState()
// Get GPS instance from parent (capture-point page) if available, otherwise create new one
const gps = inject('gps', null)

const adminConnectionClass = computed(() => {
  return gameState.adminConnected ? 'bg-green-500' : 'bg-red-500'
})

const adminConnectionTextClass = computed(() => {
  return gameState.adminConnected ? 'text-green-500' : 'text-red-500'
})

const adminConnectionStatus = computed(() => {
  return gameState.adminConnected ? 'CONNECTED' : 'OFFLINE'
})

const displayName = computed(() => {
  // Use localNodeName directly (NATO name IS the ID)
  return gameState.localNodeName || 'Awaiting assignment...'
})

const isUsingStatic = computed(() => {
  // Check if using static position
  const cp = gameState.localCapturePoint
  return !!(cp && cp.useStaticPosition && cp.staticPosition)
})

const hasGPS = computed(() => {
  // Check if GPS is actually available from the browser/device
  // This checks if the GPS composable has a position, not just if server has received it
  if (!gps) return false
  return !!(gps.position.value && gps.position.value.lat && gps.position.value.lon)
})

const gpsStatus = computed(() => {
  // Determine GPS status to display
  if (isUsingStatic.value) {
    return { text: '📌 Static GPS', class: 'text-cyan-500' }
  } else if (hasGPS.value) {
    return { text: '📍 GPS', class: 'text-green-500' }
  } else {
    return { text: '⚠ No GPS', class: 'text-amber-500' }
  }
})

</script>

