<template>
  <div class="bg-tactical-dark border-2 border-slate-700 px-4 py-2 font-mono flex items-center justify-between">
    <div class="flex items-center gap-4 text-xs">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" :class="adminConnectionClass"/>
        <span :class="adminConnectionTextClass">{{ adminConnectionStatus }}</span>
      </div>
      
      <div class="border-l-2 border-slate-700 pl-4">
        <span class="text-slate-400">MODE:</span>
        <span class="text-green-500 ml-1">{{ gameState.networkMode.toUpperCase() }}</span>
      </div>
      
      <div class="border-l-2 border-slate-700 pl-4">
        <span class="text-slate-400">POINT:</span>
        <span class="text-green-500 ml-1">{{ displayName }}</span>
      </div>
      
      <div v-if="hasGPS" class="border-l-2 border-slate-700 pl-4">
        <span class="text-green-500">📍 GPS</span>
      </div>
      <div v-else class="border-l-2 border-slate-700 pl-4">
        <span class="text-amber-500">⚠ No GPS</span>
      </div>
    </div>
    
    <div class="flex items-center gap-2">
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

const hasGPS = computed(() => {
  // Check if this node has GPS position
  const node = gameState.nodes.find(n => n.id === gameState.localNodeName)
  return !!(node && node.position)
})
</script>

