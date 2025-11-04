<template>
  <div class="bg-tactical-dark border-2 border-slate-700 p-4 font-mono">
    <h3 class="text-lg text-green-500 mb-4 border-b-2 border-slate-700 pb-2">NODE STATUS</h3>
    
    <div class="space-y-2 max-h-96 overflow-y-auto">
      <div
        v-for="node in capturePointNodes"
        :key="node.id"
        class="border border-slate-700 p-3 bg-slate-900/50"
        :class="nodeStatusClass(node)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="w-2 h-2 rounded-full" :class="node.status === 'online' ? 'bg-green-500' : 'bg-red-500'"/>
              <span class="text-sm font-bold text-slate-200">{{ getNodeDisplayName(node.id) }}</span>
            </div>
            
            <div class="text-xs text-slate-400 space-y-1">
              <div>Mode: {{ node.mode.toUpperCase() }}</div>
              <div v-if="getCapturePoint(node.id)">
                <div v-if="getCapturePoint(node.id).position">
                  <span v-if="getPositionSource(node.id) === 'static'" class="text-cyan-500">📌</span>
                  <span v-else class="text-green-500">📍</span>
                  {{ getPositionSource(node.id).toUpperCase() }}: 
                  {{ formatCoordinate(getCapturePoint(node.id).position.lat) }}, 
                  {{ formatCoordinate(getCapturePoint(node.id).position.lon) }}
                </div>
                <div v-else class="text-amber-500">⚠ No GPS</div>
                <div v-if="getCapturePoint(node.id).staticPosition" class="text-slate-500">
                  Static set: {{ formatCoordinate(getCapturePoint(node.id).staticPosition.lat) }}, 
                  {{ formatCoordinate(getCapturePoint(node.id).staticPosition.lon) }}
                </div>
              </div>
              <div v-else-if="node.position">
                GPS: {{ formatCoordinate(node.position.lat) }}, {{ formatCoordinate(node.position.lon) }}
              </div>
              <div v-else-if="!node.position && !getCapturePoint(node.id)?.position" class="text-amber-500">No GPS</div>
              <div>Last seen: {{ formatTimeSince(node.lastSeen) }}</div>
            </div>
          </div>
          
          <div class="flex flex-col gap-1">
            <button
              v-if="node.mode !== 'admin'"
              class="px-2 py-1 text-xs bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700"
              @click="showStaticModal(node.id)"
            >
              STATIC GPS
            </button>
            <button
              v-if="node.mode !== 'admin' && canTogglePositionSource(node.id)"
              class="px-2 py-1 text-xs border"
              :class="getToggleButtonClass(node.id)"
              @click="togglePositionSource(node.id)"
            >
              {{ getPositionSource(node.id) === 'static' ? 'USE GPS' : 'USE STATIC' }}
            </button>
            <button
              v-if="node.mode !== 'admin'"
              class="px-2 py-1 text-xs bg-red-900 text-red-300 border border-red-700 hover:bg-red-800"
              @click="removeNode(node.id)"
            >
              REMOVE
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="gameState.nodes.length === 0" class="text-center text-slate-500 py-8">
        No nodes connected
      </div>
    </div>
    
    <!-- Static GPS Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="closeModal"
    >
      <div
        class="bg-slate-900 border-2 border-slate-700 p-6 min-w-[400px]"
        @click.stop
      >
        <h3 class="text-lg text-green-500 mb-4">SET STATIC GPS - {{ currentNodeId }}</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-1">Latitude</label>
            <input
              v-model.number="lat"
              type="number"
              step="any"
              class="w-full bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 focus:border-green-500 focus:outline-none"
              placeholder="37.7749"
            >
          </div>
          
          <div>
            <label class="block text-sm text-slate-400 mb-1">Longitude</label>
            <input
              v-model.number="lon"
              type="number"
              step="any"
              class="w-full bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 focus:border-green-500 focus:outline-none"
              placeholder="-122.4194"
            >
          </div>
          
          <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
          
          <div class="flex gap-2 justify-end">
            <button
              class="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600"
              @click="closeModal"
            >
              CANCEL
            </button>
            <button
              class="px-4 py-2 bg-green-700 text-green-100 hover:bg-green-600"
              @click="saveStaticPosition"
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useGameState } from '~/stores/gameState.mjs'

const gameState = useGameState()
const gameSync = inject('gameSync', null)

const showModal = ref(false)
const currentNodeId = ref(null)
const lat = ref(null)
const lon = ref(null)
const error = ref(null)

// Only show capture-point nodes (exclude admin/HQ Command)
const capturePointNodes = computed(() => {
  return gameState.nodes.filter(n => n.mode === 'capture-point')
})

const getNodeDisplayName = (nodeId) => {
  // Node ID IS the NATO name now
  return nodeId
}

const nodeStatusClass = (node) => {
  return node.status === 'online' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
}

const formatCoordinate = (coord) => {
  return coord ? coord.toFixed(6) : 'N/A'
}

const formatTimeSince = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

const getCapturePoint = (nodeId) => {
  return gameState.capturePoints.find(cp => cp.id === nodeId)
}

const getPositionSource = (nodeId) => {
  const cp = getCapturePoint(nodeId)
  if (!cp) return 'none'
  if (cp.useStaticPosition && cp.staticPosition) return 'static'
  return 'gps'
}

const canTogglePositionSource = (nodeId) => {
  const cp = getCapturePoint(nodeId)
  const node = gameState.nodes.find(n => n.id === nodeId)
  return cp && cp.staticPosition && node && node.position
}

const getToggleButtonClass = (nodeId) => {
  const source = getPositionSource(nodeId)
  if (source === 'static') {
    return 'bg-cyan-900 text-cyan-300 border-cyan-700 hover:bg-cyan-800'
  }
  return 'bg-green-900 text-green-300 border-green-700 hover:bg-green-800'
}

const showStaticModal = (nodeId) => {
  currentNodeId.value = nodeId
  const cp = getCapturePoint(nodeId)
  if (cp && cp.staticPosition) {
    lat.value = cp.staticPosition.lat
    lon.value = cp.staticPosition.lon
  } else {
    lat.value = null
    lon.value = null
  }
  error.value = null
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  currentNodeId.value = null
  lat.value = null
  lon.value = null
  error.value = null
}

const saveStaticPosition = () => {
  error.value = null
  
  if (lat.value === null || lon.value === null) {
    error.value = 'Please enter both latitude and longitude'
    return
  }
  
  try {
    const command = gameState.setStaticPosition(currentNodeId.value, { lat: lat.value, lon: lon.value })
    if (command && gameSync) {
      gameSync.sendCommand(command)
      closeModal()
    } else {
      error.value = 'Failed to create command'
    }
  } catch (err) {
    error.value = err.message || 'Failed to set static position'
  }
}

const togglePositionSource = (nodeId) => {
  const command = gameState.togglePositionSource(nodeId)
  if (command && gameSync) {
    gameSync.sendCommand(command)
  }
}

const removeNode = (nodeId) => {
  if (confirm(`Remove node ${nodeId}?`)) {
    gameState.removeNode(nodeId)
  }
}
</script>

