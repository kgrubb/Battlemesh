<template>
  <div class="flex flex-col gap-6 p-6">
    <div
      v-for="team in gameState.teams"
      :key="team.id"
      class="relative"
    >
      <button
        :disabled="!canCapture"
        class="w-full min-h-[120px] border-4 font-mono font-bold text-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        :style="buttonStyle(team)"
        :class="buttonClass()"
        @click="captureForTeam(team.id)"
      >
        <div class="flex flex-col items-center justify-center gap-2">
          <div class="text-3xl">{{ team.name.toUpperCase() }}</div>
          <div v-if="isCurrentHolder(team.id)" class="text-sm opacity-75">
            CURRENTLY HELD
          </div>
        </div>
      </button>
      
      <!-- Success animation -->
      <transition name="capture-success">
        <div
          v-if="lastCapturedTeam === team.id && showSuccess"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div class="text-6xl font-bold animate-ping" :style="{ color: team.color }">
            ✓
          </div>
        </div>
      </transition>
    </div>
    
    <!-- Cooldown indicator -->
    <div v-if="cooldownRemaining > 0" class="text-center text-amber-500 text-sm font-mono">
      COOLDOWN: {{ cooldownRemaining }}ms
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'
import { CAPTURE_COOLDOWN } from '~/config/game-config.mjs'

const gameState = useGameState()

// Get gameSync from parent via inject (since it's initialized in the page)
const gameSync = inject('gameSync', null)

if (!gameSync) {
  console.error('[CaptureButtons] gameSync not provided! Capture events will not work.')
}

const canCapture = ref(true)
const cooldownRemaining = ref(0)
const lastCapturedTeam = ref(null)
const showSuccess = ref(false)

let cooldownInterval = null

const captureForTeam = (teamId) => {
  if (!canCapture.value) return
  if (!gameState.gameActive) {
    alert('Game is not active')
    return
  }
  
  // Send capture event
  if (gameSync && gameSync.sendCaptureEvent) {
    gameSync.sendCaptureEvent(teamId)
  } else {
    console.error('[CaptureButtons] ✗ gameSync not available!')
    return
  }
  
  // Visual feedback
  lastCapturedTeam.value = teamId
  showSuccess.value = true
  
  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100])
  }
  
  // Hide success animation after 1 second
  setTimeout(() => {
    showSuccess.value = false
  }, 1000)
  
  // Start cooldown
  startCooldown()
}

const startCooldown = () => {
  canCapture.value = false
  cooldownRemaining.value = CAPTURE_COOLDOWN
  
  cooldownInterval = setInterval(() => {
    cooldownRemaining.value -= 100
    
    if (cooldownRemaining.value <= 0) {
      canCapture.value = true
      clearInterval(cooldownInterval)
      cooldownInterval = null
    }
  }, 100)
}

const isCurrentHolder = (teamId) => {
  const cp = gameState.localCapturePoint
  return cp && cp.teamId === teamId
}

const buttonStyle = (team) => {
  return {
    backgroundColor: isCurrentHolder(team.id) ? team.color : '#0f172a',
    borderColor: team.color,
    color: isCurrentHolder(team.id) ? '#0f172a' : team.color,
    boxShadow: isCurrentHolder(team.id) ? `0 0 30px ${team.color}50` : 'none'
  }
}

const buttonClass = () => {
  return {
    'hover:scale-105': canCapture.value,
    'active:scale-95': canCapture.value
  }
}

onUnmounted(() => {
  if (cooldownInterval) {
    clearInterval(cooldownInterval)
  }
})
</script>

<style scoped>
.capture-success-enter-active,
.capture-success-leave-active {
  transition: opacity 0.5s;
}

.capture-success-enter-from,
.capture-success-leave-to {
  opacity: 0;
}

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1);
}
</style>

