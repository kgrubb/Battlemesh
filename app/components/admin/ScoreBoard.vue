<template>
  <div class="bg-tactical-dark border-2 border-slate-700 p-6 font-mono h-full flex flex-col">
    <h3 class="text-lg text-green-500 mb-4 border-b-2 border-slate-700 pb-2">SCOREBOARD</h3>
    
    <div class="flex-1 space-y-6">
      <div
        v-for="team in gameState.teams"
        :key="team.id"
        class="border-2 p-4 transition-all duration-300"
        :style="teamBorderStyle(team)"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-4 h-4" :style="{ backgroundColor: team.color }"/>
            <span class="text-xl font-bold" :style="{ color: team.color }">
              {{ team.name.toUpperCase() }}
            </span>
          </div>
        </div>
        
        <div class="flex items-baseline gap-2 mb-2">
          <div class="text-4xl font-bold" :style="{ color: team.color }">
            {{ team.score }}
          </div>
          <div v-if="scoreTrend(team.id)" class="text-xl" :class="scoreTrendClass(team.id)">
            {{ scoreTrend(team.id) }}
          </div>
        </div>
        
        <div class="flex items-center gap-2 text-sm text-slate-400">
          <span>+{{ pointsPerSecond(team.id) }}/sec</span>
          <span v-if="isLeading(team.id)" class="text-green-500">▲ LEADING</span>
        </div>
        
        <div class="mt-2 text-xs text-slate-500">
          {{ capturePointsHeld(team.id) }} points held
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'
import { POINTS_PER_SECOND } from '~/config/game-config.mjs'

const gameState = useGameState()
const previousScores = ref({})

const pointsPerSecond = (teamId) => {
  return gameState.capturePoints.filter(cp => cp.teamId === teamId).length * POINTS_PER_SECOND
}

const capturePointsHeld = (teamId) => {
  return gameState.capturePoints.filter(cp => cp.teamId === teamId).length
}

const teamBorderStyle = (team) => {
  return {
    borderColor: team.color,
    boxShadow: `0 10px 15px -3px ${team.color}30`
  }
}

const isLeading = (teamId) => {
  if (!gameState.gameActive) return false
  
  const team = gameState.teams.find(t => t.id === teamId)
  if (!team) return false
  
  return gameState.teams.every(t => t.id === teamId || team.score >= t.score) && team.score > 0
}

const scoreTrend = (teamId) => {
  const currentScore = gameState.teams.find(t => t.id === teamId)?.score || 0
  const previousScore = previousScores.value[teamId] || 0
  
  if (currentScore > previousScore) return '▲'
  if (currentScore < previousScore) return '▼'
  return null
}

const scoreTrendClass = (teamId) => {
  const currentScore = gameState.teams.find(t => t.id === teamId)?.score || 0
  const previousScore = previousScores.value[teamId] || 0
  
  if (currentScore > previousScore) return 'text-green-500'
  if (currentScore < previousScore) return 'text-red-500'
  return 'text-slate-500'
}

// Track score changes for trend
watch(() => gameState.teams.map(t => ({ id: t.id, score: t.score })), (newTeams) => {
  newTeams.forEach(team => {
    previousScores.value[team.id] = team.score
  })
}, { deep: true })
</script>

