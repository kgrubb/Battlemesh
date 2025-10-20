/**
 * GPS integration with Web Serial API and browser geolocation fallback
 */

export function useGPS() {
  const position = ref(null)
  const accuracy = ref(null)
  const source = ref(null) // 'serial' or 'browser'
  const error = ref(null)
  
  let serialPort = null
  let reader = null
  let watching = false
  let watchId = null
  let positionHistory = []
  const HISTORY_SIZE = 5
  
  const startSerial = async () => {
    try {
      if (!navigator.serial) {
        console.warn('[GPS] Web Serial API not supported, falling back to browser geolocation')
        startBrowserGeolocation()
        return
      }
      
      console.log('[GPS] Requesting serial port...')
      serialPort = await navigator.serial.requestPort()
      
      await serialPort.open({ baudRate: 9600 })
      console.log('[GPS] Serial port opened')
      
      source.value = 'serial'
      watching = true
      readSerialData()
    } catch (err) {
      console.error('[GPS] Serial port error:', err)
      error.value = err.message
      // Fallback to browser geolocation
      startBrowserGeolocation()
    }
  }
  
  const readSerialData = async () => {
    try {
      const textDecoder = new TextDecoderStream()
      serialPort.readable.pipeTo(textDecoder.writable)
      reader = textDecoder.readable.getReader()
      
      let buffer = ''
      
      while (watching) {
        const { value, done } = await reader.read()
        if (done) break
        
        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop() // Keep incomplete line in buffer
        
        for (const line of lines) {
          parseNMEA(line.trim())
        }
      }
    } catch (err) {
      console.error('[GPS] Error reading serial data:', err)
      error.value = err.message
      startBrowserGeolocation()
    }
  }
  
  const parseNMEA = (sentence) => {
    if (!sentence.startsWith('$')) return
    
    const parts = sentence.split(',')
    
    // Parse GPGGA or GPRMC sentences
    if (parts[0] === '$GPGGA' || parts[0] === '$GNGGA') {
      // $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
      if (parts.length >= 10 && parts[2] && parts[4]) {
        const lat = parseCoordinate(parts[2], parts[3])
        const lon = parseCoordinate(parts[4], parts[5])
        const quality = parseInt(parts[6])
        
        if (quality > 0) {
          updatePosition(lat, lon, parseFloat(parts[8]) || 1.0)
        }
      }
    } else if (parts[0] === '$GPRMC' || parts[0] === '$GNRMC') {
      // $GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
      if (parts.length >= 7 && parts[3] && parts[5] && parts[2] === 'A') {
        const lat = parseCoordinate(parts[3], parts[4])
        const lon = parseCoordinate(parts[5], parts[6])
        updatePosition(lat, lon, 5.0) // Estimate accuracy
      }
    }
  }
  
  const parseCoordinate = (value, direction) => {
    if (!value || !direction) return null
    
    const degrees = Math.floor(parseFloat(value) / 100)
    const minutes = parseFloat(value) % 100
    let decimal = degrees + minutes / 60
    
    if (direction === 'S' || direction === 'W') {
      decimal *= -1
    }
    
    return decimal
  }
  
  const startBrowserGeolocation = () => {
    if (!navigator.geolocation) {
      error.value = 'Geolocation not supported'
      return
    }
    
    console.log('[GPS] Starting browser geolocation')
    source.value = 'browser'
    
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updatePosition(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        )
        error.value = null
      },
      (err) => {
        console.error('[GPS] Geolocation error:', err)
        error.value = err.message
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    )
  }
  
  const updatePosition = (lat, lon, acc) => {
    positionHistory.push({ lat, lon, acc })
    
    if (positionHistory.length > HISTORY_SIZE) {
      positionHistory.shift()
    }
    
    // Smooth position using running average
    const smoothed = {
      lat: positionHistory.reduce((sum, p) => sum + p.lat, 0) / positionHistory.length,
      lon: positionHistory.reduce((sum, p) => sum + p.lon, 0) / positionHistory.length
    }
    
    position.value = smoothed
    accuracy.value = acc
    error.value = null
  }
  
  const stop = async () => {
    watching = false
    
    if (reader) {
      try {
        await reader.cancel()
        reader = null
      } catch (err) {
        console.error('[GPS] Error canceling reader:', err)
      }
    }
    
    if (serialPort) {
      try {
        await serialPort.close()
        serialPort = null
      } catch (err) {
        console.error('[GPS] Error closing serial port:', err)
      }
    }
    
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    
    source.value = null
  }
  
  const isSupported = () => {
    return (typeof navigator !== 'undefined') && (navigator.serial || navigator.geolocation)
  }
  
  onUnmounted(() => {
    stop()
  })
  
  return {
    position,
    accuracy,
    source,
    error,
    startSerial,
    startBrowserGeolocation,
    stop,
    isSupported
  }
}

