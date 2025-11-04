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
const activities = computed(() => gameState.activityFeed || [])

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

const getAdminPin = () => {
  return import.meta.client ? sessionStorage.getItem('battlemesh_admin_pin') : null
}

const clearActivities = async () => {
  try {
    const pin = getAdminPin()
    await $fetch('/api/activity/clear', { method: 'POST', headers: pin ? { 'X-Admin-Pin': pin } : {} })
  } catch (e) {
    console.warn('[ActivityFeed] clearActivities failed', e)
  }
}

// Client no longer generates activity entries; server is the single source of truth
</script>

