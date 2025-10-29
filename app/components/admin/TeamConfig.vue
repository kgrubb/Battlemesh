<template>
  <div class="bg-tactical-dark border-2 border-slate-700 font-mono">
    <button
      class="w-full p-4 text-left flex items-center justify-between hover:bg-slate-800/30 transition-colors"
      @click="toggleCollapse"
    >
      <h3 class="text-lg text-green-500">TEAM CONFIG</h3>
      <span class="text-green-500 text-xl">{{ isCollapsed ? '▼' : '▲' }}</span>
    </button>
    
    <div v-show="!isCollapsed" class="p-4 pt-0">
    
    <div class="space-y-3 mb-4">
      <div
        v-for="team in gameState.teams"
        :key="team.id"
        class="flex items-center gap-2 p-2 border border-slate-700 bg-slate-900/50"
      >
        <input
          v-model="team.color"
          type="color"
          class="w-8 h-8 border-0 flex-shrink-0"
          @change="onTeamUpdated"
        >
        <input
          v-model="team.name"
          type="text"
          class="flex-1 min-w-0 bg-slate-800 border border-slate-600 px-2 py-1 text-slate-100 font-mono text-xs"
          placeholder="Team name"
          @blur="onTeamUpdated"
        >
        <button
          class="px-2 py-1 text-xs bg-red-900 text-red-300 border border-red-700 hover:bg-red-800 flex-shrink-0 whitespace-nowrap"
          @click="removeTeam(team.id)"
        >
          ✕
        </button>
      </div>
    </div>
    
    <div class="border-t-2 border-slate-700 pt-4 mb-4">
      <div class="flex gap-2 mb-2">
        <input
          v-model="newTeamName"
          type="text"
          placeholder="New team name"
          class="flex-1 min-w-0 bg-slate-800 border border-slate-600 px-2 py-1 text-slate-100 font-mono text-xs"
          :class="errorMessage ? 'border-red-500' : ''"
          @keyup.enter="addTeam"
        >
        <input
          v-model="newTeamColor"
          type="color"
          class="w-8 h-8 border border-slate-600 flex-shrink-0"
        >
      </div>
      <div v-if="errorMessage" class="text-red-500 text-xs mb-2">
        {{ errorMessage }}
      </div>
      <button
        class="w-full px-4 py-2 bg-green-900 text-green-300 border border-green-700 hover:bg-green-800 text-sm"
        @click="addTeam"
      >
        ADD TEAM
      </button>
    </div>
    
    <div class="border-t-2 border-slate-700 pt-4 space-y-2">
      <button
        class="w-full px-4 py-2 bg-red-900 text-red-300 border border-red-700 hover:bg-red-800 text-sm"
        :disabled="gameState.gameActive"
        :class="gameState.gameActive ? 'opacity-50 cursor-not-allowed' : ''"
        @click="resetGame"
      >
        RESET SCORES
      </button>
      <button
        class="w-full px-4 py-2 bg-red-950 text-red-400 border border-red-800 hover:bg-red-900 text-xs"
        :disabled="gameState.gameActive"
        :class="gameState.gameActive ? 'opacity-50 cursor-not-allowed' : ''"
        @click="clearAllState"
      >
        CLEAR ALL STATE
      </button>
    </div>
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'
import { validateTeamName, validateTeamColor } from '~/utils/validation.mjs'

const gameState = useGameState()
const _gameSync = inject('gameSync', null)
const isCollapsed = ref(false)
const errorMessage = ref('')

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// Auto-collapse when game starts
watch(() => gameState.gameActive, (isActive) => {
  if (isActive) {
    isCollapsed.value = true
  }
})

const newTeamName = ref('')
const newTeamColor = ref('#10b981')

const addTeam = () => {
  errorMessage.value = ''
  
  const nameValidation = validateTeamName(newTeamName.value)
  if (!nameValidation.valid) {
    errorMessage.value = nameValidation.error
    return
  }
  
  const colorValidation = validateTeamColor(newTeamColor.value)
  if (!colorValidation.valid) {
    errorMessage.value = colorValidation.error
    return
  }
  
  try {
    gameState.addTeam(nameValidation.value, colorValidation.value)
    newTeamName.value = ''
    newTeamColor.value = '#10b981'
  } catch (err) {
    errorMessage.value = err.message
  }
}

const removeTeam = (teamId) => {
  if (gameState.teams.length <= 2) {
    alert('Must have at least 2 teams')
    return
  }
  
  if (confirm(`Remove team?`)) {
    gameState.removeTeam(teamId)
  }
}

const resetGame = () => {
  if (confirm('Reset all scores and captures to zero?')) {
    gameState.resetGame()
    
    // Immediately broadcast state to all capture nodes
    if (_gameSync) {
      _gameSync.broadcastState()
    }
  }
}

const clearAllState = () => {
  if (confirm('Clear ALL game state including teams, scores, and activity feed? This will delete the save file and cannot be undone.')) {
    // Send clear command to server
    if (_gameSync && _gameSync.wsClient) {
      _gameSync.wsClient.send({
        type: 'clear-server-state',
        timestamp: Date.now()
      })
    }
  }
}

const onTeamUpdated = () => {
  // Persist to server whenever team name or color is edited
  gameState.persistToServer()
  
  // Immediately broadcast updated state to all capture points
  if (_gameSync) {
    _gameSync.broadcastState()
  }
}
</script>

