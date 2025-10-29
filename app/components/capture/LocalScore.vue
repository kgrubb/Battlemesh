<template>
  <div class="bg-tactical-dark border-2 border-slate-700 p-1 lg:p-4 font-mono min-w-[120px] lg:min-w-0">
    <h3 class="text-xs lg:text-sm text-green-500 mb-2 lg:mb-3 text-center">CURRENT SCORES</h3>
    
    <div class="grid grid-cols-2 gap-1 lg:gap-4">
      <div
        v-for="team in gameState.teams"
        :key="team.id"
        class="border-2 p-1 lg:p-3 text-center"
        :style="{ borderColor: team.color }"
      >
        <div class="text-xs mb-1" :style="{ color: team.color }">
          {{ team.name.toUpperCase() }}
        </div>
        <div class="text-lg lg:text-2xl font-bold" :style="{ color: team.color }">
          {{ team.score }}
        </div>
      </div>
    </div>
    
    <div class="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t-2 border-slate-700 text-center">
      <div class="text-xs text-slate-400 mb-1">THIS POINT</div>
      <div class="text-sm lg:text-lg font-bold" :style="{ color: currentHolderColor }">
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

