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
          :value="getTeamLocalValue(team.id, 'color')"
          type="color"
          class="w-8 h-8 border-0 flex-shrink-0"
          @input="updateTeamLocalValue(team.id, 'color', $event.target.value)"
          @change="onTeamUpdated(team.id, 'color', getTeamLocalValue(team.id, 'color'))"
        >
        <input
          :value="getTeamLocalValue(team.id, 'name')"
          type="text"
          class="flex-1 min-w-0 bg-slate-800 border border-slate-600 px-2 py-1 text-slate-100 font-mono text-xs"
          placeholder="Team name"
          @input="updateTeamLocalValue(team.id, 'name', $event.target.value)"
          @focus="setTeamFieldFocused(team.id, 'name', true)"
          @blur="handleTeamNameBlur(team.id)"
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

// Local state for team edits to prevent reset while typing
const teamLocalValues = ref(new Map()) // Map<teamId, { name: string, color: string }>
const focusedFields = ref(new Map()) // Map<teamId, Set<fieldName>>

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// Auto-collapse when game starts
watch(() => gameState.gameActive, (isActive) => {
  if (isActive) {
    isCollapsed.value = true
  }
})

// Sync local values when teams change (but only if field is not focused)
watch(() => gameState.teams, (teams) => {
  teams.forEach(team => {
    // Initialize local values for new teams
    if (!teamLocalValues.value.has(team.id)) {
      teamLocalValues.value.set(team.id, {
        name: team.name,
        color: team.color
      })
    }
    
    const isNameFocused = focusedFields.value.get(team.id)?.has('name')
    const isColorFocused = focusedFields.value.get(team.id)?.has('color')
    
    if (!isNameFocused) {
      updateTeamLocalValue(team.id, 'name', team.name, false)
    }
    if (!isColorFocused) {
      updateTeamLocalValue(team.id, 'color', team.color, false)
    }
  })
  
  // Clean up local values for teams that no longer exist
  const currentTeamIds = new Set(teams.map(t => t.id))
  for (const teamId of teamLocalValues.value.keys()) {
    if (!currentTeamIds.has(teamId)) {
      teamLocalValues.value.delete(teamId)
      focusedFields.value.delete(teamId)
    }
  }
}, { deep: true })

// Initialize local values from gameState
const initializeLocalValues = () => {
  gameState.teams.forEach(team => {
    if (!teamLocalValues.value.has(team.id)) {
      teamLocalValues.value.set(team.id, {
        name: team.name,
        color: team.color
      })
    }
  })
}

// Initialize on mount
onMounted(() => {
  initializeLocalValues()
})

const getTeamLocalValue = (teamId, field) => {
  const local = teamLocalValues.value.get(teamId)
  if (local && local[field] !== undefined) {
    return local[field]
  }
  // Fallback to gameState if local value not set
  const team = gameState.teams.find(t => t.id === teamId)
  return team ? team[field] : ''
}

const updateTeamLocalValue = (teamId, field, value, updateFocused = true) => {
  if (!teamLocalValues.value.has(teamId)) {
    teamLocalValues.value.set(teamId, { name: '', color: '' })
  }
  const local = teamLocalValues.value.get(teamId)
  local[field] = value
  
  if (updateFocused) {
    setTeamFieldFocused(teamId, field, true)
  }
}

const setTeamFieldFocused = (teamId, field, isFocused) => {
  if (!focusedFields.value.has(teamId)) {
    focusedFields.value.set(teamId, new Set())
  }
  const focused = focusedFields.value.get(teamId)
  if (isFocused) {
    focused.add(field)
  } else {
    focused.delete(field)
  }
}

const handleTeamNameBlur = (teamId) => {
  setTeamFieldFocused(teamId, 'name', false)
  const localName = getTeamLocalValue(teamId, 'name')
  onTeamUpdated(teamId, 'name', localName)
}

const newTeamName = ref('')
const newTeamColor = ref('#10b981')

const addTeam = () => {
  errorMessage.value = ''
  
  // Basic client-side validation for immediate feedback
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
  
  // Send command to server - server validates and processes
  const command = gameState.addTeam(nameValidation.value, colorValidation.value)
  if (command && _gameSync) {
    _gameSync.sendCommand(command)
    newTeamName.value = ''
    newTeamColor.value = '#10b981'
  } else {
    errorMessage.value = 'Failed to create command'
  }
}

const removeTeam = (teamId) => {
  if (gameState.teams.length <= 2) {
    alert('Must have at least 2 teams')
    return
  }
  
  if (confirm(`Remove team?`)) {
    // Clean up local state
    teamLocalValues.value.delete(teamId)
    focusedFields.value.delete(teamId)
    
    const command = gameState.removeTeam(teamId)
    if (command && _gameSync) {
      _gameSync.sendCommand(command)
    }
  }
}

const resetGame = () => {
  if (confirm('Reset all scores and captures to zero?')) {
    const command = gameState.resetGame()
    if (command && _gameSync) {
      _gameSync.sendCommand(command)
    }
  }
}

const clearAllState = async () => {
  if (confirm('Clear ALL game state including teams, scores, and activity feed? This will delete the save file and cannot be undone.')) {
    try {
      const pin = import.meta.client ? sessionStorage.getItem('battlemesh_admin_pin') : null
      await $fetch('/api/state/clear', { method: 'POST', headers: pin ? { 'X-Admin-Pin': pin } : {} })
    } catch (e) {
      console.warn('[TeamConfig] clearAllState failed', e)
    }
  }
}

const onTeamUpdated = (teamId, field, value) => {
  // Send update command to server
  const command = gameState.updateTeam(teamId, { [field]: value })
  if (command && _gameSync) {
    _gameSync.sendCommand(command)
  }
}
</script>

