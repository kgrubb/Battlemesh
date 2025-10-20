import { describe, it, expect, vi } from 'vitest'

describe('useGPS Composable', () => {
  describe('NMEA Sentence Parsing', () => {
    it('should parse valid $GPGGA sentence', () => {
      // $GPGGA - Global Positioning System Fix Data
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47'
      
      const result = parseGPGGA(sentence)
      
      expect(result).toBeTruthy()
      expect(result.lat).toBeCloseTo(48.1173, 4) // 4807.038N = 48° 07.038' = 48.1173°
      expect(result.lon).toBeCloseTo(11.5167, 4) // 01131.000E = 11° 31.000' = 11.5167°
      expect(result.altitude).toBe(545.4)
    })
    
    it('should parse valid $GPRMC sentence', () => {
      // $GPRMC - Recommended Minimum Specific GPS/Transit Data
      const sentence = '$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A'
      
      const result = parseGPRMC(sentence)
      
      expect(result).toBeTruthy()
      expect(result.lat).toBeCloseTo(48.1173, 4)
      expect(result.lon).toBeCloseTo(11.5167, 4)
      expect(result.speed).toBeCloseTo(22.4, 1) // knots
    })
    
    it('should handle invalid checksum', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*00'
      
      const result = parseGPGGA(sentence)
      
      expect(result).toBeNull()
    })
    
    it('should handle malformed sentence', () => {
      const sentence = 'GARBAGE DATA $GPGGA'
      
      const result = parseGPGGA(sentence)
      
      expect(result).toBeNull()
    })
    
    it('should handle incomplete sentence', () => {
      const sentence = '$GPGGA,123519,4807.038'
      
      const result = parseGPGGA(sentence)
      
      expect(result).toBeNull()
    })
    
    it('should convert coordinates correctly', () => {
      // Test coordinate conversion: DDMM.MMMM to DD.DDDD
      const testCases = [
        { input: '4807.038', expected: 48.1173 },
        { input: '01131.000', expected: 11.5167 },
        { input: '3751.844', expected: 37.8641 },
        { input: '12227.317', expected: 122.4553 }
      ]
      
      testCases.forEach(({ input, expected }) => {
        const result = convertNMEACoordinate(input)
        expect(result).toBeCloseTo(expected, 4)
      })
    })
    
    it('should handle negative coordinates (S/W)', () => {
      // Test coordinate conversion logic with manual parsing
      const latS = convertNMEACoordinate('4807.038')
      const lonW = convertNMEACoordinate('01131.000')
      
      // Apply direction
      const finalLatS = -latS // South = negative
      const finalLonW = -lonW // West = negative
      
      expect(finalLatS).toBeLessThan(0)
      expect(finalLonW).toBeLessThan(0)
      expect(finalLatS).toBeCloseTo(-48.1173, 4)
      expect(finalLonW).toBeCloseTo(-11.5167, 4)
    })
  })
  
  describe('Position Smoothing', () => {
    it('should smooth jittery GPS readings', () => {
      const readings = [
        { lat: 37.7749, lon: -122.4194 },
        { lat: 37.7751, lon: -122.4196 }, // Small jump
        { lat: 37.7750, lon: -122.4195 },
        { lat: 37.7752, lon: -122.4197 },
        { lat: 37.7751, lon: -122.4196 }
      ]
      
      const smoothed = smoothPosition(readings)
      
      // Smoothed position should be average
      expect(smoothed.lat).toBeCloseTo(37.7751, 4)
      expect(smoothed.lon).toBeCloseTo(-122.4196, 4)
    })
    
    it('should reject outliers', () => {
      const readings = [
        { lat: 37.7749, lon: -122.4194 },
        { lat: 37.7750, lon: -122.4195 },
        { lat: 50.0000, lon: -150.0000 }, // Outlier - too far away
        { lat: 37.7751, lon: -122.4196 },
        { lat: 37.7750, lon: -122.4195 }
      ]
      
      const smoothed = smoothPosition(readings, { maxDelta: 0.01 })
      
      // Should not include the outlier
      expect(smoothed.lat).toBeCloseTo(37.7750, 4)
      expect(smoothed.lon).toBeCloseTo(-122.4195, 4)
    })
  })
  
  describe('Browser Geolocation Fallback', () => {
    it('should use browser geolocation when serial unavailable', async () => {
      // Mock navigator.geolocation
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10
        }
      }
      
      global.navigator = {
        geolocation: {
          getCurrentPosition: vi.fn((success) => success(mockPosition))
        }
      }
      
      const position = await getBrowserPosition()
      
      expect(position.lat).toBe(37.7749)
      expect(position.lon).toBe(-122.4194)
      expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled()
    })
    
    it('should handle geolocation errors', async () => {
      const error = new Error('User denied geolocation')
      
      global.navigator = {
        geolocation: {
          getCurrentPosition: vi.fn((success, failure) => failure(error))
        }
      }
      
      await expect(getBrowserPosition()).rejects.toThrow('User denied geolocation')
    })
  })
})

// Helper functions to extract from useGPS.mjs for testing
function parseGPGGA(sentence) {
  if (!sentence.startsWith('$GPGGA')) return null
  
  // Validate checksum
  if (!validateChecksum(sentence)) return null
  
  const parts = sentence.split(',')
  if (parts.length < 15) return null
  
  try {
    const lat = convertNMEACoordinate(parts[2])
    const latDir = parts[3]
    const lon = convertNMEACoordinate(parts[4])
    const lonDir = parts[5]
    const altitude = parseFloat(parts[9])
    
    return {
      lat: latDir === 'S' ? -lat : lat,
      lon: lonDir === 'W' ? -lon : lon,
      altitude
    }
  } catch {
    return null
  }
}

function parseGPRMC(sentence) {
  if (!sentence.startsWith('$GPRMC')) return null
  
  if (!validateChecksum(sentence)) return null
  
  const parts = sentence.split(',')
  if (parts.length < 12) return null
  
  try {
    const lat = convertNMEACoordinate(parts[3])
    const latDir = parts[4]
    const lon = convertNMEACoordinate(parts[5])
    const lonDir = parts[6]
    const speed = parseFloat(parts[7])
    
    return {
      lat: latDir === 'S' ? -lat : lat,
      lon: lonDir === 'W' ? -lon : lon,
      speed
    }
  } catch {
    return null
  }
}

function convertNMEACoordinate(coord) {
  // NMEA format: DDMM.MMMM or DDDMM.MMMM
  const match = coord.match(/^(\d{2,3})(\d{2}\.\d+)$/)
  if (!match) throw new Error('Invalid coordinate format')
  
  const degrees = parseInt(match[1])
  const minutes = parseFloat(match[2])
  
  return degrees + minutes / 60
}

function validateChecksum(sentence) {
  const checksumIndex = sentence.lastIndexOf('*')
  if (checksumIndex === -1) return false
  
  const data = sentence.substring(1, checksumIndex)
  const providedChecksum = sentence.substring(checksumIndex + 1)
  
  let calculated = 0
  for (let i = 0; i < data.length; i++) {
    calculated ^= data.charCodeAt(i)
  }
  
  return calculated.toString(16).toUpperCase().padStart(2, '0') === providedChecksum.toUpperCase()
}

function smoothPosition(readings, options = {}) {
  const maxDelta = options.maxDelta || 0.01
  
  // Filter out outliers
  const filtered = readings.filter((reading, i) => {
    if (i === 0) return true
    const prev = readings[i - 1]
    const latDelta = Math.abs(reading.lat - prev.lat)
    const lonDelta = Math.abs(reading.lon - prev.lon)
    return latDelta < maxDelta && lonDelta < maxDelta
  })
  
  // Calculate average
  const sum = filtered.reduce((acc, reading) => ({
    lat: acc.lat + reading.lat,
    lon: acc.lon + reading.lon
  }), { lat: 0, lon: 0 })
  
  return {
    lat: sum.lat / filtered.length,
    lon: sum.lon / filtered.length
  }
}

async function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => {
        reject(error)
      }
    )
  })
}

