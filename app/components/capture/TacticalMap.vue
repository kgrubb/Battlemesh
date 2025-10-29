<template>
  <div class="bg-tactical-dark border-2 border-slate-700 p-2 lg:p-4 font-mono h-full flex flex-col">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-2 lg:mb-4 gap-2 lg:gap-0">
      <h3 class="text-sm lg:text-lg text-green-500">TACTICAL MAP</h3>
      <div class="flex gap-2 items-center">
        <div class="text-xs text-slate-400 mr-2">
          {{ pointsWithGPS }} / {{ allPointsCount }} points located
        </div>
        <button 
          class="px-2 py-1 border border-slate-600 text-xs transition-colors"
          :class="pointsWithGPS > 0 ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 text-slate-600 cursor-not-allowed'"
          :disabled="pointsWithGPS === 0"
          @click="centerOnPoints"
        >
          CENTER
        </button>
      </div>
    </div>
    
    <ClientOnly>
      <div class="flex-1 relative border-2 border-slate-800 bg-slate-950 overflow-hidden min-h-0">
        <div ref="mapContainer" class="absolute inset-0 z-0 w-full h-full" />
        
        <!-- Legend overlay -->
        <div class="absolute top-1 left-1 lg:top-2 lg:left-2 bg-slate-900/90 border border-slate-700 p-1 lg:p-2 text-xs z-[1002] max-w-[120px] lg:max-w-none">
          <div class="text-green-500 font-bold mb-1">LEGEND</div>
          <div class="flex items-center gap-1 lg:gap-2 mb-1">
            <div class="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-slate-400" />
            <span class="text-slate-300 text-xs">Neutral</span>
          </div>
          <div v-for="team in gameState.teams" :key="team.id" class="flex items-center gap-1 lg:gap-2 mb-1">
            <div class="w-2 h-2 lg:w-3 lg:h-3 rounded-full" :style="{ backgroundColor: team.color }" />
            <span class="text-slate-300 text-xs">{{ team.name }}</span>
          </div>
          <div class="border-t border-slate-700 mt-1 lg:mt-2 pt-1 lg:pt-2">
            <div class="flex items-center gap-1 lg:gap-2">
              <div class="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-green-500 ring-1 lg:ring-2 ring-green-500/50" />
              <span class="text-green-500 font-bold text-xs">This Point</span>
            </div>
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
const capturePointsOnly = computed(() => 
  gameState.capturePoints.filter(cp => {
    const node = gameState.nodes.find(n => n.id === cp.id)
    return !node || node.mode === 'capture-point'
  })
)

const allPointsCount = computed(() => capturePointsOnly.value.length)
const pointsWithGPS = computed(() => capturePointsOnly.value.filter(cp => cp.position).length)

const getTeamColor = (teamId) => {
  if (!teamId) return '#9ca3af'
  return gameState.teams.find(t => t.id === teamId)?.color || '#9ca3af'
}

const createCustomIcon = (color, isLocal = false) => {
  if (!L) return null
  
  const size = isLocal ? 32 : 24
  const ringStyle = isLocal ? 'box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.5);' : ''
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid #0f172a;
      box-shadow: 0 0 10px ${color}80;
      ${ringStyle}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
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
      zoomControl: true,
      attributionControl: false
    })
    
    // Add satellite imagery
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
      className: 'map-tiles',
      maxZoom: 19
    }).addTo(map)
    
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map)
    
    console.log('[TacticalMap] ✓ Map initialized')
  } catch (error) {
    console.error('[TacticalMap] Error initializing map:', error)
  }
}

const updateMarkers = () => {
  if (!map || !L) return
  
  // Remove old markers
  markers.forEach((marker, id) => {
    const baseId = id.replace('-label', '')
    if (!capturePointsOnly.value.find(cp => cp.id === baseId)) {
      map.removeLayer(marker)
      markers.delete(id)
    }
  })
  
  // Add or update markers for all capture points (excluding admin nodes)
  capturePointsOnly.value.forEach(cp => {
    if (!cp.position) return
    
    const isLocal = cp.id === gameState.localNodeName
    const color = getTeamColor(cp.teamId)
    const latlng = [cp.position.lat, cp.position.lon]
    const icon = createCustomIcon(color, isLocal)
    if (!icon) return
    
    if (markers.has(cp.id)) {
      const marker = markers.get(cp.id)
      marker.setLatLng(latlng)
      marker.setIcon(icon)
      
      // Update label
      const labelMarker = markers.get(`${cp.id}-label`)
      if (labelMarker) {
        labelMarker.setLatLng(latlng)
        const labelIcon = createLabelIcon(cp, color, isLocal)
        if (labelIcon) labelMarker.setIcon(labelIcon)
      }
    } else {
      const displayName = cp.id // NATO name IS the ID
      
      const marker = L.marker(latlng, {
        icon,
        title: displayName
      }).addTo(map)
      
      const teamName = cp.teamId ? (gameState.teams.find(t => t.id === cp.teamId)?.name || 'Neutral') : 'Neutral'
      
      marker.bindPopup(`
        <div class="font-mono text-sm">
          <div class="font-bold text-green-500 mb-1">${isLocal ? '📍 ' : ''}${displayName}</div>
          <div class="text-slate-300 mb-1">
            Team: <span style="color: ${color}">${teamName}</span>
          </div>
          <div class="text-slate-400 text-xs">Captures: ${cp.totalCaptures}</div>
        </div>
      `)
      
      // Add label
      const labelIcon = createLabelIcon(cp, color, isLocal)
      if (labelIcon) {
        const label = L.marker(latlng, {
          icon: labelIcon,
          interactive: false
        }).addTo(map)
        markers.set(`${cp.id}-label`, label)
      }
      
      markers.set(cp.id, marker)
      
      // Center on local marker first time
      if (isLocal && markers.size === 1) {
        map.setView(latlng, 16)
      }
    }
  })
}

const createLabelIcon = (cp, color, isLocal) => {
  if (!L) return null
  
  const labelText = cp.id // NATO name IS the ID
  const prefix = isLocal ? '📍 ' : ''
  
  return L.divIcon({
    className: 'marker-label',
    html: `<div style="
      background: rgba(15, 23, 42, 0.9);
      color: ${isLocal ? '#10b981' : color};
      padding: 2px 6px;
      border: 1px solid ${isLocal ? '#10b981' : color};
      font-size: 11px;
      font-family: monospace;
      white-space: nowrap;
      font-weight: bold;
      pointer-events: none;
    ">${prefix}${labelText}</div>`,
    iconSize: [80, 20],
    iconAnchor: [40, -15]
  })
}

const centerOnPoints = () => {
  if (!map || !L) {
    console.log('[TacticalMap] Map not ready for centering')
    return
  }
  
  const pointsWithPosition = capturePointsOnly.value.filter(cp => cp.position)
  
  if (pointsWithPosition.length === 0) {
    console.log('[TacticalMap] No points with GPS to center on')
    return
  }
  
  console.log(`[TacticalMap] Centering on ${pointsWithPosition.length} point(s)`)
  
  // Prioritize centering on local point if available
  const localCp = gameState.localCapturePoint
  if (localCp && localCp.position) {
    map.setView([localCp.position.lat, localCp.position.lon], 16)
  } else if (pointsWithPosition.length === 1) {
    const cp = pointsWithPosition[0]
    map.setView([cp.position.lat, cp.position.lon], 16)
  } else {
    const bounds = L.latLngBounds(
      pointsWithPosition.map(cp => [cp.position.lat, cp.position.lon])
    )
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

onMounted(async () => {
  await nextTick()
  await initMap()
  
  // Multiple attempts to ensure map renders properly on mobile
  const resizeMap = () => {
    if (map) {
      map.invalidateSize()
    }
  }
  
  // Initial resize attempts
  setTimeout(resizeMap, 100)
  setTimeout(resizeMap, 300)
  setTimeout(resizeMap, 500)
  
  // Handle orientation changes and viewport changes
  const handleResize = () => {
    setTimeout(resizeMap, 100)
  }
  
  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', handleResize)
  
  // Handle intersection observer for mobile visibility
  if (mapContainer.value && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && map) {
          setTimeout(() => {
            map.invalidateSize()
          }, 100)
        }
      })
    })
    
    observer.observe(mapContainer.value)
    
    onUnmounted(() => {
      observer.disconnect()
    })
  }
  
  updateMarkers()
  
  // If we have a local position, center on it
  const localCp = gameState.localCapturePoint
  if (localCp && localCp.position && map) {
    map.setView([localCp.position.lat, localCp.position.lon], 16)
  }
  
  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('orientationchange', handleResize)
  })
})

watch(() => gameState.capturePoints, () => {
  updateMarkers()
}, { deep: true })

watch(() => gameState.capturePoints.map(cp => cp.teamId).join(','), () => {
  updateMarkers()
})

// Watch for visibility changes and layout changes
watch(() => mapContainer.value, (newContainer) => {
  if (newContainer && map) {
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
/* Ensure map container works with safe areas */
.flex-1 {
  min-height: 0;
  height: 100%;
}

/* Map container sizing */
.absolute.inset-0 {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

/* Slight darkening for satellite imagery */
:deep(.map-tiles) {
  filter: brightness(85%) contrast(110%);
}

/* Style Leaflet controls */
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

:deep(.leaflet-control-attribution) {
  display: none !important;
}

/* Mobile landscape mode fixes */
@media screen and (max-width: 1024px) and (orientation: landscape) {
  .flex-1 {
    overflow: hidden !important;
    max-width: 100% !important;
  }
  
  .absolute.inset-0 {
    overflow: hidden !important;
    max-width: 100% !important;
  }
}
</style>

