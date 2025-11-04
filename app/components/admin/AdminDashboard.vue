<template>
  <div 
    class="bg-tactical-dark border-2 p-4 font-mono transition-all duration-300"
    :class="statusBorderClass"
  >
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-4">
        <h2 class="text-xl text-green-500">MISSION CONTROL</h2>
        <div class="flex items-center gap-2">
          <div 
            class="w-4 h-4 rounded-full animate-pulse"
            :class="statusDotClass"
          />
          <span class="text-xl font-bold" :class="statusTextClass">
            {{ gameState.gameActive ? 'LIVE' : 'STANDBY' }}
          </span>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <div v-if="gameState.gameActive" class="text-amber-500 text-lg">
          {{ formatTime(elapsedTime) }}
        </div>
        
        <div class="flex items-center gap-2">
          <div 
            class="w-3 h-3 rounded-full"
            :class="networkHealthClass"
          />
          <span class="text-sm" :class="networkHealthTextClass">
            {{ networkHealthText }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="flex items-center justify-between">
      <div class="flex gap-4 items-center">
        <button
          v-if="!gameState.gameActive"
          class="px-6 py-3 bg-green-500 text-slate-900 font-bold border-2 border-green-400 hover:bg-green-400 transition-colors"
          @click="startGame"
        >
          START MISSION
        </button>
        <button
          v-else
          class="px-6 py-3 bg-red-500 text-slate-900 font-bold border-2 border-red-400 hover:bg-red-400 transition-colors"
          @click="stopGame"
        >
          STOP MISSION
        </button>
        
        <!-- Network Mode Toggle -->
        <div class="flex gap-2 border-l-2 border-slate-700 pl-4">
          <button
            class="px-3 py-2 border-2 text-xs transition-colors"
            :class="gameState.networkMode === 'wifi' 
              ? 'bg-green-500 text-slate-900 border-green-400' 
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'"
            @click="switchNetworkMode('wifi')"
          >
            WiFi
          </button>
          <button
            class="px-3 py-2 border-2 text-xs transition-colors"
            :class="gameState.networkMode === 'meshtastic' 
              ? 'bg-green-500 text-slate-900 border-green-400' 
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'"
            @click="switchNetworkMode('meshtastic')"
          >
            Mesh
          </button>
        </div>
      </div>
      
      <div v-if="gameState.gameActive && leadingTeam" class="flex items-center gap-2 text-lg">
        <span :style="{ color: leadingTeam.color }" class="font-bold">
          {{ leadingTeam.name.toUpperCase() }}
        </span>
        <span class="text-slate-400">LEADING</span>
        <span v-if="scoreDifference > 0" class="text-slate-500">
          +{{ scoreDifference }}
        </span>
      </div>
      
      <div v-else-if="gameState.gameActive && isTied" class="flex items-center gap-2 text-lg">
        <span class="text-amber-500 font-bold">TIED GAME</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'

const gameState = useGameState()
const gameSync = inject('gameSync', null)
const elapsedTime = ref(0)
let timer = null

const statusBorderClass = computed(() => 
  gameState.gameActive 
    ? 'border-green-500 shadow-lg shadow-green-500/30'
    : 'border-slate-700'
)

const statusDotClass = computed(() => 
  gameState.gameActive ? 'bg-green-500' : 'bg-slate-600'
)

const statusTextClass = computed(() => 
  gameState.gameActive ? 'text-green-500' : 'text-slate-500'
)

const leadingTeam = computed(() => {
  if (!gameState.teams.length) return null
  
  const sorted = [...gameState.teams].sort((a, b) => b.score - a.score)
  const [leader, second] = sorted
  
  return leader?.score > second?.score ? leader : null
})

const isTied = computed(() => {
  if (gameState.teams.length < 2) return false
  const scores = gameState.teams.map(t => t.score)
  return scores.every(s => s === scores[0])
})

const scoreDifference = computed(() => {
  if (!leadingTeam.value) return 0
  
  const sorted = [...gameState.teams].sort((a, b) => b.score - a.score)
  const [leader, second] = sorted
  
  return leader.score - (second?.score || 0)
})

// Only count capture-point nodes (exclude admin/HQ Command)
const onlineNodesCount = computed(() => 
  gameState.nodes.filter(n => n.status === 'online' && n.mode === 'capture-point').length
)

const totalNodesCount = computed(() => 
  gameState.nodes.filter(n => n.mode === 'capture-point').length
)

const networkHealthClass = computed(() => {
  const ratio = onlineNodesCount.value / Math.max(totalNodesCount.value, 1)
  if (ratio === 1) return 'bg-green-500'
  if (ratio >= 0.75) return 'bg-amber-500'
  return 'bg-red-500'
})

const networkHealthTextClass = computed(() => {
  const ratio = onlineNodesCount.value / Math.max(totalNodesCount.value, 1)
  if (ratio === 1) return 'text-green-500'
  if (ratio >= 0.75) return 'text-amber-500'
  return 'text-red-500'
})

const networkHealthText = computed(() => {
  return `${onlineNodesCount.value}/${totalNodesCount.value} NODES ONLINE`
})

const startGame = () => {
  // Send command to server - server processes and broadcasts state
  const command = gameState.startGame()
  if (command && gameSync) {
    gameSync.sendCommand(command)
  }
  startTimer()
}

const stopGame = () => {
  // Send command to server - server processes and broadcasts state
  const command = gameState.stopGame()
  if (command && gameSync) {
    gameSync.sendCommand(command)
  }
  stopTimer()
}

const startTimer = () => {
  stopTimer()
  timer = setInterval(() => {
    if (gameState.gameStartTime) {
      elapsedTime.value = Math.floor((Date.now() - gameState.gameStartTime) / 1000)
    }
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const switchNetworkMode = async (mode) => {
  if (gameState.networkMode === mode) return
  
  if (!gameSync) {
    console.error('[AdminDashboard] gameSync not available')
    return
  }
  
  if (confirm(`Switch to ${mode.toUpperCase()} mode? This will reconnect all network connections.`)) {
    await gameSync.switchNetworkMode(mode)
  }
}

watch(() => gameState.gameActive, (active) => {
  if (active) {
    startTimer()
  } else {
    stopTimer()
  }
})

watch(() => gameState.gameStartTime, (newStartTime) => {
  if (!newStartTime) {
    elapsedTime.value = 0
  }
})

onMounted(() => {
  if (gameState.gameActive) {
    startTimer()
  }
})

onUnmounted(() => {
  stopTimer()
})
</script>

