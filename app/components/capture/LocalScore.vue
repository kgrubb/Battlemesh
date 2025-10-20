<template>
  <div class="bg-tactical-dark border-2 border-slate-700 p-4 font-mono">
    <h3 class="text-sm text-green-500 mb-3 text-center">CURRENT SCORES</h3>
    
    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="team in gameState.teams"
        :key="team.id"
        class="border-2 p-3 text-center"
        :style="{ borderColor: team.color }"
      >
        <div class="text-xs mb-1" :style="{ color: team.color }">
          {{ team.name.toUpperCase() }}
        </div>
        <div class="text-2xl font-bold" :style="{ color: team.color }">
          {{ team.score }}
        </div>
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t-2 border-slate-700 text-center">
      <div class="text-xs text-slate-400 mb-1">THIS POINT</div>
      <div class="text-lg font-bold" :style="{ color: currentHolderColor }">
        {{ currentHolderName }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'

const gameState = useGameState()

const currentHolderColor = computed(() => {
  const cp = gameState.localCapturePoint
  if (!cp || !cp.teamId) return '#9ca3af'
  
  const team = gameState.teams.find(t => t.id === cp.teamId)
  return team ? team.color : '#9ca3af'
})

const currentHolderName = computed(() => {
  const cp = gameState.localCapturePoint
  if (!cp || !cp.teamId) return 'NEUTRAL'
  
  const team = gameState.teams.find(t => t.id === cp.teamId)
  return team ? team.name.toUpperCase() : 'NEUTRAL'
})
</script>

