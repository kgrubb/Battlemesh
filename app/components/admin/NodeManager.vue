<template>
  <div class="bg-tactical-dark border-2 border-slate-700 p-4 font-mono">
    <h3 class="text-lg text-green-500 mb-4 border-b-2 border-slate-700 pb-2">NODE STATUS</h3>
    
    <div class="space-y-2 max-h-96 overflow-y-auto">
      <div
        v-for="node in gameState.nodes"
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
              <div v-if="node.position">
                GPS: {{ formatCoordinate(node.position.lat) }}, {{ formatCoordinate(node.position.lon) }}
              </div>
              <div v-else class="text-amber-500">No GPS</div>
              <div>Last seen: {{ formatTimeSince(node.lastSeen) }}</div>
            </div>
          </div>
          
          <button
            v-if="node.mode !== 'admin'"
            class="px-2 py-1 text-xs bg-red-900 text-red-300 border border-red-700 hover:bg-red-800"
            @click="removeNode(node.id)"
          >
            REMOVE
          </button>
        </div>
      </div>
      
      <div v-if="gameState.nodes.length === 0" class="text-center text-slate-500 py-8">
        No nodes connected
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'

const gameState = useGameState()

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

const removeNode = (nodeId) => {
  if (confirm(`Remove node ${nodeId}?`)) {
    gameState.removeNode(nodeId)
  }
}
</script>

