<template>
  <ErrorBoundary component-name="Admin Control">
    <!-- PIN Entry Modal - Only show if no stored PIN exists -->
    <!-- Use ClientOnly to prevent hydration mismatch -->
    <ClientOnly>
      <div v-if="!pinEntered && isClientReady" class="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center">
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md w-full mx-4">
        <h2 class="text-2xl font-bold text-slate-100 mb-2">Admin Access Required</h2>
        <p class="text-slate-400 mb-6">Enter the 6-digit PIN from the server console to continue.</p>
        
        <form class="space-y-4" @submit.prevent="handlePinSubmit">
          <div>
            <label for="pin" class="block text-sm font-medium text-slate-300 mb-2">PIN</label>
            <input
              id="pin"
              v-model="pinInput"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              autocomplete="off"
              :class="[
                'w-full px-4 py-3 bg-slate-900 border rounded-lg text-slate-100 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 transition-all',
                pinError ? 'border-red-500 focus:ring-red-500 focus:border-red-500 animate-shake' : 'border-slate-600 focus:ring-blue-500 focus:border-transparent'
              ]"
              placeholder="000000"
              autofocus>
          </div>
          
          <div v-if="pinError" class="text-red-400 text-sm mt-2">
            {{ pinError }}
          </div>
          
          <button
            type="submit"
            :disabled="pinInput.length !== 6"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            Connect
          </button>
        </form>
      </div>
    </div>
    <template #fallback>
      <!-- Show loading state during SSR/hydration -->
      <div class="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center">
        <div class="text-slate-400">Loading...</div>
      </div>
    </template>
    </ClientOnly>
    
    <div v-if="pinEntered" class="h-screen bg-slate-950 text-slate-100 font-mono p-4 overflow-hidden flex flex-col">
      <!-- Tactical grid background -->
      <div class="fixed inset-0 opacity-10 pointer-events-none" style="background-image: linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px); background-size: 20px 20px;"/>
      
      <div class="relative z-10 w-full flex-1 flex flex-col min-h-0">
      <!-- Mission Control Header -->
      <div class="mb-4 flex-none">
        <AdminDashboard />
      </div>
      
      <!-- Main layout -->
      <div class="flex gap-4 flex-1 min-h-0">
        <!-- Left: Scoreboard & Activity Feed -->
        <div class="w-96 flex flex-col gap-4 min-h-0 flex-shrink-0">
          <div class="flex-1 min-h-0">
            <ScoreBoard />
          </div>
          <div class="flex-none" style="height: 280px;">
            <ActivityFeed ref="activityFeed" />
          </div>
        </div>
        
        <!-- Center: Map (takes remaining space) -->
        <div class="flex-1 min-h-0">
          <MapView />
        </div>
        
        <!-- Right: Node Manager, Team Config -->
        <div class="w-96 flex flex-col gap-4 overflow-y-auto min-h-0 flex-shrink-0">
          <NodeManager />
          <TeamConfig />
        </div>
      </div>
    </div>
    </div>
  </ErrorBoundary>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'
import { useGameSync } from '~/composables/useGameSync.mjs'
import { useGPS } from '~/composables/useGPS.mjs'
import ErrorBoundary from '~/components/ErrorBoundary.vue'
import AdminDashboard from '~/components/admin/AdminDashboard.vue'
import ActivityFeed from '~/components/admin/ActivityFeed.vue'
import ScoreBoard from '~/components/admin/ScoreBoard.vue'
import MapView from '~/components/admin/MapView.vue'
import NodeManager from '~/components/admin/NodeManager.vue'
import TeamConfig from '~/components/admin/TeamConfig.vue'

defineOptions({
  name: 'AdminPage'
})

const gameState = useGameState()
const gameSync = useGameSync()
const gps = useGPS()
const activityFeed = ref(null)

// PIN entry state
// Check sessionStorage synchronously before render to prevent modal flash
const SESSION_STORAGE_KEY = 'battlemesh_admin_pin'

// Start with false to ensure SSR/client match (will be updated on client mount)
const pinEntered = ref(false)
const pinInput = ref('')
const pinError = ref('')
const adminPin = ref('')
const isClientReady = ref(false)

// Check sessionStorage on client only (after mount)
const checkStoredPin = () => {
  if (import.meta.server) return false
  try {
    const storedPin = sessionStorage.getItem(SESSION_STORAGE_KEY)
    return storedPin && storedPin.length === 6
  } catch {
    return false
  }
}

// Client-side initialization to check for stored PIN
if (import.meta.client) {
  // Check synchronously on client side
  const hasStoredPin = checkStoredPin()
  try {
    if (hasStoredPin) {
      const storedPin = sessionStorage.getItem(SESSION_STORAGE_KEY)
      // Do not mark pinEntered until server validation succeeds
      adminPin.value = storedPin
    }
  } catch {
    // Ignore errors
  } finally {
    isClientReady.value = true
  }
}

// Provide gameSync to child components
provide('gameSync', gameSync)

// Keyboard shortcuts
const handleKeyDown = (event) => {
  // Ignore if typing in an input
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return
  }
  
  switch (event.key.toLowerCase()) {
    case ' ': // Space bar - Start/Stop
      event.preventDefault()
      if (gameState.gameActive) {
        const command = gameState.stopGame()
        if (command && gameSync) {
          gameSync.sendCommand(command)
        }
      } else {
        const command = gameState.startGame()
        if (command && gameSync) {
          gameSync.sendCommand(command)
        }
      }
      break
    case 'r': // R - Reset
      event.preventDefault()
      if (confirm('Reset all scores and captures to zero?')) {
        const command = gameState.resetGame()
        if (command && gameSync) {
          gameSync.sendCommand(command)
        }
      }
      break
    case 'c': // C - Center map
      event.preventDefault()
      // Will trigger via CENTER button click simulation
      document.querySelector('button:has-text("CENTER")')?.click()
      break
  }
}


// Restrict PIN input to numeric only
watch(pinInput, (newVal) => {
  pinInput.value = newVal.replace(/\D/g, '').slice(0, 6)
  // Clear error when user starts typing
  if (pinError.value && newVal.length > 0) {
    pinError.value = ''
  }
})

// Track if we're currently validating to prevent duplicate submissions
let isValidating = false

// Handle PIN submission - validate PIN before initializing
const handlePinSubmit = async () => {
  if (pinInput.value.length !== 6) {
    pinError.value = 'PIN must be 6 digits'
    return
  }
  
  // Prevent multiple submissions
  if (isValidating) {
    return
  }
  
  isValidating = true
  
  pinError.value = ''
  
  const submittedPin = pinInput.value
  
  // Show validating state (will be cleared on success or error)
  
  // Don't set pinEntered yet - validate PIN first
  // Initialize game state (but don't connect yet)
  // Don't call gameState.initialize() here - it might trigger auto-connect
  // We'll handle initialization after PIN validation
  if (!gameState.localNodeName) {
    gameState.nodeMode = 'admin'
    gameState.localNodeName = 'HQ Command'
  }
  
  // Validate PIN by attempting admin register (performed inside initialize)
  try {
    // Do not persist PIN until validation succeeds
    adminPin.value = submittedPin
    gameState.nodeMode = 'admin'
    gameState.localNodeName = 'HQ Command'
    await gameState.initialize()
    await gameSync.initialize(submittedPin)
    // Persist only after successful validation
    sessionStorage.setItem(SESSION_STORAGE_KEY, submittedPin)
    // Seed latest server state immediately
    try {
      const st = await $fetch('/api/state')
      gameState.syncFromServer(st)
    } catch (e) {
      console.warn('[Admin] Failed to seed state after login', e)
    }
    pinEntered.value = true
    isValidating = false
  } catch (error) {
    isValidating = false
    console.error('[Admin] PIN submission failed:', error)
    
    // Extract clean error message - prefer statusMessage from h3 errors
    let errorMessage = 'Invalid PIN. Please try again.'
    if (error?.statusMessage) {
      errorMessage = error.statusMessage
    } else if (error?.message) {
      // If message contains "invalid admin pin", extract just that part
      const match = error.message.match(/invalid admin pin/i)
      if (match) {
        errorMessage = 'invalid admin pin'
      } else {
        errorMessage = error.message
      }
    }
    
    pinError.value = errorMessage
    // Ensure no invalid PIN is kept
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
    adminPin.value = ''
    pinEntered.value = false
    // Don't re-throw - let the UI handle the error with shake animation
    // Tests can check pinError.value instead
  }
}

// Track if initialization has been completed to prevent duplicate handlers
let initializationCompleted = false

// Shared state for tracking if we've received server state
// SSE provides state; no explicit request tracking needed

// Complete admin initialization after PIN is validated
const completeAdminInitialization = () => {
  // Prevent duplicate initialization
  if (initializationCompleted) {
    return
  }
  initializationCompleted = true
  
  // Ensure node mode is set to admin
  if (gameState.nodeMode !== 'admin') {
    gameState.nodeMode = 'admin'
    gameState.localNodeName = 'HQ Command'
  }
  
  // SSE-driven updates are handled inside useGameSync; nothing to wire here
  
  // Set up connected listener for requesting server state
  // No explicit state request; SSE provides periodic state
  
  // If already connected when this is called, request state immediately
  // (the connected handler won't fire again)
  // Initial state will arrive via SSE 1s tick
  
  gameSync.activeNetwork.value = 'wifi'
  
  // Start GPS tracking
  if (gps.isSupported()) {
    gps.startSerial().catch(() => {
      console.log('Serial GPS not available, using browser geolocation')
    })
  }
  
  // Watch GPS position and send updates
  watch(() => gps.position.value, (position) => {
    if (position && gameState.localNodeName) {
      // For admin, send position update command to server
      const command = gameState.updateNodePosition(gameState.localNodeName, position)
      if (command && gameSync) {
        gameSync.sendCommand(command)
      }
    }
  })
  
  // Add keyboard shortcut listener
  window.addEventListener('keydown', handleKeyDown)
}

// Legacy function name for backwards compatibility (used by test helper)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const initializeAdminConnection = completeAdminInitialization

// Attempt to reconnect with stored PIN from sessionStorage
const attemptAutoReconnect = async () => {
  try {
    const storedPin = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (storedPin && storedPin.length === 6) {
      console.log('[Admin] Found stored PIN, initializing...')
      adminPin.value = storedPin
      gameState.nodeMode = 'admin'
      gameState.localNodeName = 'HQ Command'
      await gameState.initialize()
      await gameSync.initialize(storedPin)
      // Seed state for activity feed immediately on auto-login
      try {
        const st = await $fetch('/api/state')
        gameState.syncFromServer(st)
      } catch (e) {
        console.warn('[Admin] Failed to seed state after auto-login', e)
      }
      pinEntered.value = true
    }
  } catch (e) {
    console.warn('[Admin] Error during auto-init:', e)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
    adminPin.value = ''
    pinEntered.value = false
  }
}

onMounted(async () => {
  // Ensure client is ready
  if (!isClientReady.value) {
    isClientReady.value = true
  }
  
  // Re-check for stored PIN on mount (in case it was set synchronously)
  if (!pinEntered.value) {
    const hasStoredPin = checkStoredPin()
    if (hasStoredPin) {
      try {
        const storedPin = sessionStorage.getItem(SESSION_STORAGE_KEY)
        // Do not set pinEntered here; wait for successful auto-reconnect
        adminPin.value = storedPin
      } catch {
        // Ignore errors
      }
    }
  }
  
  // If a stored PIN exists, try to auto-reconnect (without changing pinEntered first)
  if (checkStoredPin()) {
    await attemptAutoReconnect()
  }
  
  // Expose test helper for e2e tests (always available in dev mode)
  // This allows tests to bypass Vue reactivity issues
  // Check for dev mode or test mode (Playwright runs in dev mode)
  if (import.meta.env.DEV || import.meta.env.VITEST || typeof window !== 'undefined') {
    // Expose a function that tests can use to set PIN and submit
    window.__TEST_SET_ADMIN_PIN__ = async (pin) => {
      pinInput.value = pin
      if (pinInput.value.length === 6) {
        await handlePinSubmit()
        // Wait a bit for reactive updates to propagate
        await new Promise(resolve => setTimeout(resolve, 200))
        // Return the current state so tests can check if it succeeded
        return { success: pinEntered.value, error: pinError.value }
      }
      return { success: false, error: 'PIN must be 6 digits' }
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// Set page title
useHead({
  title: 'BattleMesh - Admin Control',
  meta: [
    { name: 'description', content: 'Airsoft capture point admin control panel' }
  ]
})
</script>

