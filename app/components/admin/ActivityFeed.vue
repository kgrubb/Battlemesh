<template>
  <div class="bg-tactical-dark border-2 border-slate-700 p-4 font-mono">
    <h3 class="text-lg text-green-500 mb-4 border-b-2 border-slate-700 pb-2 flex items-center justify-between">
      <span>ACTIVITY FEED</span>
      <button 
        v-if="activities.length > 0"
        class="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        @click="clearActivities"
      >
        CLEAR
      </button>
    </h3>
    
    <div class="space-y-2 max-h-64 overflow-y-auto">
      <div
        v-for="activity in recentActivities"
        :key="activity.id"
        class="p-2 border-l-4 bg-slate-900/50 text-sm transition-opacity duration-500"
        :class="activityBorderClass(activity)"
        :style="{ opacity: getActivityOpacity(activity) }"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <span class="text-slate-300">{{ activity.message }}</span>
          </div>
          <div class="text-xs text-slate-500">
            {{ formatTime(activity.timestamp) }}
          </div>
        </div>
      </div>
      
      <div v-if="activities.length === 0" class="text-center text-slate-600 py-8 text-sm">
        No activity yet. Start the mission to begin!
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'

const gameState = useGameState()
const gameSync = inject('gameSync', null)
const activities = ref([])

const recentActivities = computed(() => {
  return activities.value.slice(0, 10)
})

const getActivityOpacity = (activity) => {
  const age = Date.now() - activity.timestamp
  const fadeStart = 30000 // 30 seconds
  if (age < fadeStart) return 1
  return 0.5
}

const activityBorderClass = (activity) => {
  if (activity.type === 'capture') {
    const team = gameState.teams.find(t => t.id === activity.teamId)
    if (team) {
      // Can't use dynamic Tailwind classes, so we'll use inline styles
      return 'border-l-green-500'
    }
  }
  if (activity.type === 'game-start') return 'border-l-green-500'
  if (activity.type === 'game-stop') return 'border-l-red-500'
  if (activity.type === 'reset') return 'border-l-amber-500'
  if (activity.type === 'node-join') return 'border-l-blue-500'
  if (activity.type === 'node-leave') return 'border-l-slate-500'
  return 'border-l-slate-700'
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

const addActivity = (type, message, teamId = null) => {
  // Send activity to server for persistence
  if (gameSync && gameSync.wsClient) {
    gameSync.wsClient.send({
      type: 'activity-event',
      activityType: type,
      message,
      teamId,
      timestamp: Date.now()
    })
  }
}

const clearActivities = () => {
  // Send clear command to server
  if (gameSync && gameSync.wsClient) {
    gameSync.wsClient.send({
      type: 'clear-activity-feed',
      timestamp: Date.now()
    })
  }
}

// Watch for game state changes
watch(() => gameState.gameActive, (isActive, wasActive) => {
  if (isActive && !wasActive) {
    addActivity('game-start', 'Mission started')
  } else if (!isActive && wasActive) {
    addActivity('game-stop', 'Mission stopped')
  }
})

// Watch for capture events - use ID-based comparison instead of index
const capturePointsMap = ref(new Map())

watch(() => gameState.capturePoints, (newPoints) => {
  if (!newPoints) return
  
  newPoints.forEach(newCp => {
    const oldData = capturePointsMap.value.get(newCp.id)
    
    if (oldData && newCp.totalCaptures > oldData.captures) {
      // Capture happened!
      const team = gameState.teams.find(t => t.id === newCp.teamId)
      if (team) {
        addActivity('capture', `${newCp.id} captured by ${team.name}`, team.id)
      }
    }
    
    // Update the map with current state
    capturePointsMap.value.set(newCp.id, {
      teamId: newCp.teamId,
      captures: newCp.totalCaptures
    })
  })
}, { deep: true, immediate: true })

// Watch for node changes
watch(() => gameState.nodes.length, (newCount, oldCount) => {
  if (oldCount && newCount > oldCount) {
    addActivity('node-join', `Node connected (${newCount} total)`)
  } else if (oldCount && newCount < oldCount) {
    addActivity('node-leave', `Node disconnected (${newCount} total)`)
  }
})

// Listen for activity events from server
onMounted(() => {
  if (gameSync && gameSync.wsClient) {
    gameSync.wsClient.on('activity-added', (data) => {
      if (data.activity) {
        activities.value.unshift(data.activity)
      }
    })
    
    gameSync.wsClient.on('activity-feed-cleared', () => {
      activities.value = []
    })
    
    gameSync.wsClient.on('server-state', (data) => {
      // Sync activity feed from server state
      if (data.state && data.state.activityFeed) {
        activities.value = [...data.state.activityFeed]
      }
    })
  }
})

// Expose methods for external use
defineExpose({
  addActivity,
  clearActivities
})
</script>

