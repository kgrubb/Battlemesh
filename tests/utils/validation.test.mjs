import { describe, it, expect } from 'vitest'
import {
  validateTeamName,
  validateTeamColor,
  validateGPSCoordinate,
  validateTeamId
} from '../../app/utils/validation.mjs'

describe('Validation Utilities', () => {
  describe('validateTeamName', () => {
    it('should accept valid team name', () => {
      const result = validateTeamName('Red Team')
      expect(result.valid).toBe(true)
      expect(result.value).toBe('Red Team')
    })

    it('should trim whitespace from team name', () => {
      const result = validateTeamName('  Blue Team  ')
      expect(result.valid).toBe(true)
      expect(result.value).toBe('Blue Team')
    })

    it('should reject empty string', () => {
      const result = validateTeamName('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject whitespace-only string', () => {
      const result = validateTeamName('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject names longer than 50 characters', () => {
      const result = validateTeamName('A'.repeat(51))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('50 characters')
    })

    it('should reject special characters', () => {
      const result = validateTeamName('Team@123!')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('letters, numbers')
    })

    it('should accept hyphens and spaces', () => {
      const result = validateTeamName('Alpha-Bravo Team 1')
      expect(result.valid).toBe(true)
      expect(result.value).toBe('Alpha-Bravo Team 1')
    })

    it('should reject null or undefined', () => {
      expect(validateTeamName(null).valid).toBe(false)
      expect(validateTeamName(undefined).valid).toBe(false)
    })
  })

  describe('validateTeamColor', () => {
    it('should accept valid hex color', () => {
      const result = validateTeamColor('#FF0000')
      expect(result.valid).toBe(true)
      expect(result.value).toBe('#FF0000')
    })

    it('should accept lowercase hex', () => {
      const result = validateTeamColor('#ff0000')
      expect(result.valid).toBe(true)
      expect(result.value).toBe('#ff0000')
    })

    it('should reject short hex codes', () => {
      const result = validateTeamColor('#FFF')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('hex code')
    })

    it('should reject colors without hash', () => {
      const result = validateTeamColor('FF0000')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('hex code')
    })

    it('should reject invalid characters', () => {
      const result = validateTeamColor('#GGGGGG')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('hex code')
    })

    it('should reject empty or null', () => {
      expect(validateTeamColor('').valid).toBe(false)
      expect(validateTeamColor(null).valid).toBe(false)
    })
  })

  describe('validateGPSCoordinate', () => {
    it('should accept valid coordinates', () => {
      const result = validateGPSCoordinate(37.7749, -122.4194)
      expect(result.valid).toBe(true)
      expect(result.value).toEqual({ lat: 37.7749, lon: -122.4194 })
    })

    it('should accept equator and prime meridian', () => {
      const result = validateGPSCoordinate(0, 0)
      expect(result.valid).toBe(true)
    })

    it('should accept poles', () => {
      expect(validateGPSCoordinate(90, 0).valid).toBe(true)
      expect(validateGPSCoordinate(-90, 0).valid).toBe(true)
    })

    it('should accept date line', () => {
      expect(validateGPSCoordinate(0, 180).valid).toBe(true)
      expect(validateGPSCoordinate(0, -180).valid).toBe(true)
    })

    it('should reject latitude > 90', () => {
      const result = validateGPSCoordinate(91, 0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Latitude')
    })

    it('should reject latitude < -90', () => {
      const result = validateGPSCoordinate(-91, 0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Latitude')
    })

    it('should reject longitude > 180', () => {
      const result = validateGPSCoordinate(0, 181)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Longitude')
    })

    it('should reject longitude < -180', () => {
      const result = validateGPSCoordinate(0, -181)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Longitude')
    })

    it('should reject NaN values', () => {
      expect(validateGPSCoordinate(NaN, 0).valid).toBe(false)
      expect(validateGPSCoordinate(0, NaN).valid).toBe(false)
    })

    it('should reject non-numeric values', () => {
      const result = validateGPSCoordinate('37.7749', -122.4194)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('numbers')
    })
  })

  describe('validateTeamId', () => {
    const teams = [
      { id: 1, name: 'Red Team', color: '#ef4444' },
      { id: 2, name: 'Blue Team', color: '#3b82f6' }
    ]

    it('should accept valid numeric team ID', () => {
      const result = validateTeamId(1, teams)
      expect(result.valid).toBe(true)
      expect(result.value).toBe(1)
    })

    it('should reject invalid team ID', () => {
      const result = validateTeamId(99, teams)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should reject null team ID', () => {
      const result = validateTeamId(null, teams)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject null or undefined', () => {
      expect(validateTeamId(null, teams).valid).toBe(false)
      expect(validateTeamId(undefined, teams).valid).toBe(false)
    })
  })
})

