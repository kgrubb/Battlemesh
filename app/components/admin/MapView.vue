<template>
  <div class="bg-tactical-dark border-2 border-slate-700 p-4 font-mono h-full flex flex-col">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg text-green-500">TACTICAL MAP</h3>
      <div class="flex gap-2 items-center">
        <div class="text-xs text-slate-400 mr-2">
          {{ capturePointsWithGPS }} / {{ capturePointsOnly.length }} points located
        </div>
        <button 
          class="px-2 py-1 border border-slate-600 text-xs transition-colors"
          :class="capturePointsWithGPS > 0 ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 text-slate-600 cursor-not-allowed'"
          :disabled="capturePointsWithGPS === 0"
          @click="centerOnPoints"
        >
          CENTER
        </button>
      </div>
    </div>
    
    <ClientOnly>
      <div class="flex-1 relative border-2 border-slate-800 bg-slate-950 overflow-hidden">
        <div ref="mapContainer" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0;" />
        
        <!-- Legend overlay -->
        <div class="absolute top-2 left-2 bg-slate-900/90 border border-slate-700 p-2 text-xs z-[1002]">
          <div class="text-green-500 font-bold mb-1">LEGEND</div>
          <div class="flex items-center gap-2 mb-1">
            <div class="w-3 h-3 rounded-full bg-slate-400" />
            <span class="text-slate-300">Neutral</span>
          </div>
          <div v-for="team in gameState.teams" :key="team.id" class="flex items-center gap-2 mb-1">
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: team.color }" />
            <span class="text-slate-300">{{ team.name }}</span>
          </div>
        </div>
      </div>
      <template #fallback>
        <div class="flex-1 relative border-2 border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden">
          <div class="text-slate-500 text-sm">Loading map...</div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import { useGameState } from '~/stores/gameState.mjs'

const gameState = useGameState()
const mapContainer = ref(null)
let map = null
let L = null
const markers = new Map()

// Only count capture-point nodes (exclude admin)
const capturePointsOnly = computed(() => {
  return gameState.capturePoints.filter(cp => {
    const node = gameState.nodes.find(n => n.id === cp.id)
    return !node || node.mode === 'capture-point'
  })
})

const capturePointsWithGPS = computed(() => {
  return capturePointsOnly.value.filter(cp => cp.position).length
})

const getTeamColor = (teamId) => {
  if (!teamId) return '#9ca3af' // neutral gray
  const team = gameState.teams.find(t => t.id === teamId)
  return team ? team.color : '#9ca3af'
}

const createCustomIcon = (color) => {
  if (!L) return null
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid #0f172a;
      box-shadow: 0 0 10px ${color}80;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

const createLabelIcon = (cp, color) => {
  if (!L) return null
  
  const labelText = cp.id // NATO name IS the ID
  
  return L.divIcon({
    className: 'marker-label',
    html: `<div style="
      background: rgba(15, 23, 42, 0.9);
      color: ${color};
      padding: 2px 6px;
      border: 1px solid ${color};
      font-size: 11px;
      font-family: monospace;
      white-space: nowrap;
      font-weight: bold;
      pointer-events: none;
    ">${labelText}</div>`,
    iconSize: [80, 20],
    iconAnchor: [40, -15]
  })
}

const initMap = async () => {
  if (!import.meta.client) return
  if (!mapContainer.value) return
  
  try {
    // Dynamically import Leaflet only on client side
    if (!L) {
      const leaflet = await import('leaflet')
      L = leaflet.default
      await import('leaflet/dist/leaflet.css')
    }
    
    // Try to get user's location first
    let initialCenter = [37.0902, -95.7129]
    let initialZoom = 4
    
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
            enableHighAccuracy: true
          })
        })
        
        initialCenter = [position.coords.latitude, position.coords.longitude]
        initialZoom = 15
      }
    } catch {
      // Use default center
    }
    
    map = L.map(mapContainer.value, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    })
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
      className: 'map-tiles',
      maxZoom: 19
    }).addTo(map)
    
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map)
    
    console.log('[MapView] ✓ Map initialized')
  } catch (error) {
    console.error('[MapView] Error initializing map:', error)
  }
}

const formatTimeSince = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

const updateMarkers = () => {
  if (!map || !L) return
  
  // Remove markers that no longer exist
  markers.forEach((marker, id) => {
    const baseId = id.replace('-label', '')
    if (!gameState.capturePoints.find(cp => cp.id === baseId)) {
      map.removeLayer(marker)
      markers.delete(id)
    }
  })
  
  // Add or update markers for capture points
  gameState.capturePoints.forEach(cp => {
    if (!cp.position) return
    
    const color = getTeamColor(cp.teamId)
    const latlng = [cp.position.lat, cp.position.lon]
    const icon = createCustomIcon(color)
    if (!icon) return
    
    if (markers.has(cp.id)) {
      // Update existing marker
      const marker = markers.get(cp.id)
      marker.setLatLng(latlng)
      marker.setIcon(icon)
      
      // Also update label position and color
      const labelMarker = markers.get(`${cp.id}-label`)
      if (labelMarker) {
        labelMarker.setLatLng(latlng)
        const labelIcon = createLabelIcon(cp, color)
        if (labelIcon) labelMarker.setIcon(labelIcon)
      }
    } else {
      // Create new marker
      const marker = L.marker(latlng, {
        icon,
        title: cp.id // Tooltip on hover
      }).addTo(map)
      
      const node = gameState.nodes.find(n => n.id === cp.id)
      const teamName = cp.teamId ? (gameState.teams.find(t => t.id === cp.teamId)?.name || 'Unknown') : 'Neutral'
      const nodeStatus = node?.status === 'online' ? '🟢 Online' : '🔴 Offline'
      const lastSeen = node ? formatTimeSince(node.lastSeen) : 'Unknown'
      const nodeName = cp.id // NATO name IS the ID
      
      marker.bindPopup(`
        <div class="font-mono text-sm">
          <div class="font-bold text-green-500 mb-2">${nodeName}</div>
          <div class="text-slate-300 mb-1">
            <span class="text-slate-400">Team:</span> 
            <span style="color: ${getTeamColor(cp.teamId)}">${teamName}</span>
          </div>
          <div class="text-slate-400 text-xs mb-1">Total Captures: ${cp.totalCaptures}</div>
          <div class="text-slate-400 text-xs mb-1">${nodeStatus}</div>
          <div class="text-slate-400 text-xs">Last Seen: ${lastSeen}</div>
        </div>
      `)
      
      // Add permanent label
      const labelIcon = createLabelIcon(cp, color)
      if (labelIcon) {
        const label = L.marker(latlng, {
          icon: labelIcon,
          interactive: false
        }).addTo(map)
        markers.set(`${cp.id}-label`, label)
      }
      
      markers.set(cp.id, marker)
    }
  })
}

const centerOnPoints = () => {
  if (!map || !L) {
    console.log('[MapView] Map not ready for centering')
    return
  }
  
  const pointsWithGPS = gameState.capturePoints.filter(cp => cp.position)
  
  if (pointsWithGPS.length === 0) {
    console.log('[MapView] No points with GPS to center on')
    return
  }
  
  console.log(`[MapView] Centering on ${pointsWithGPS.length} point(s)`)
  
  if (pointsWithGPS.length === 1) {
    const cp = pointsWithGPS[0]
    map.setView([cp.position.lat, cp.position.lon], 16)
  } else {
    const bounds = L.latLngBounds(
      pointsWithGPS.map(cp => [cp.position.lat, cp.position.lon])
    )
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

onMounted(async () => {
  await nextTick()
  await initMap()
  
  // Give Leaflet a moment to render, then invalidate size
  setTimeout(() => {
    if (map) {
      map.invalidateSize()
    }
    updateMarkers()
    
    // Auto-center if we have GPS data
    if (capturePointsWithGPS.value > 0) {
      centerOnPoints()
    }
  }, 100)
})

watch(() => gameState.capturePoints, () => {
  updateMarkers()
}, { deep: true })

watch(() => gameState.capturePoints.map(cp => cp.teamId).join(','), () => {
  updateMarkers()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
/* Slight darkening for satellite imagery to match theme */
:deep(.map-tiles) {
  filter: brightness(85%) contrast(110%);
}

/* Style Leaflet controls to match theme */
:deep(.leaflet-control-zoom) {
  border: 1px solid #475569 !important;
  background: #1e293b !important;
}

:deep(.leaflet-control-zoom a) {
  background-color: #334155 !important;
  color: #10b981 !important;
  border-bottom: 1px solid #475569 !important;
}

:deep(.leaflet-control-zoom a:hover) {
  background-color: #475569 !important;
}

:deep(.leaflet-popup-content-wrapper) {
  background: #0f172a !important;
  color: #e2e8f0 !important;
  border: 1px solid #475569 !important;
}

:deep(.leaflet-popup-tip) {
  background: #0f172a !important;
}

:deep(.custom-marker) {
  background: transparent !important;
  border: none !important;
}

/* Hide Leaflet attribution */
:deep(.leaflet-control-attribution) {
  display: none !important;
}
</style>

