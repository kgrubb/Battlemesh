<template>
  <div v-if="!gameState.adminConnected && gameState.teams.length === 0" class="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-50">
    <div class="text-center">
      <div class="text-6xl text-green-500 mb-4 animate-pulse">⟳</div>
      <div class="text-2xl text-green-500 mb-2">CONNECTING TO ADMIN...</div>
      <div class="text-sm text-slate-400">Node ID: {{ shortNodeId }}</div>
      <div class="text-xs text-slate-500 mt-4">
        Make sure admin server is running
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'

const gameState = useGameState()

const shortNodeId = computed(() => {
  return gameState.localNodeName || 'Awaiting assignment...'
})
</script>

