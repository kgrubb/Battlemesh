import { describe, it, expect, beforeEach } from 'vitest'
import {
  getNextCaptureName,
  resetNameIndex,
  CAPTURE_POINT_NAMES
} from '../../app/utils/nodeNames.mjs'

describe('Node Names Utilities', () => {
  beforeEach(() => {
    resetNameIndex()
  })

  describe('getNextCaptureName', () => {
    it('should return a name from the pool', () => {
      const name = getNextCaptureName()
      
      expect(CAPTURE_POINT_NAMES).toContain(name)
    })

    it('should return unique names', () => {
      const name1 = getNextCaptureName()
      const name2 = getNextCaptureName()
      
      expect(name1).not.toBe(name2)
    })

    it('should track used names', () => {
      const names = new Set()
      
      for (let i = 0; i < 10; i++) {
        names.add(getNextCaptureName())
      }
      
      expect(names.size).toBe(10)
    })

    it('should handle exhausting the name pool', () => {
      // Use all available names
      const usedNames = []
      for (let i = 0; i < CAPTURE_POINT_NAMES.length; i++) {
        usedNames.push(getNextCaptureName())
      }
      
      // Next name should have a number suffix
      const extraName = getNextCaptureName()
      expect(extraName).toMatch(/-\d+$/)
    })

    it('should provide numbered names after pool exhausted', () => {
      // Exhaust pool
      for (let i = 0; i < CAPTURE_POINT_NAMES.length; i++) {
        getNextCaptureName()
      }
      
      const name1 = getNextCaptureName()
      const name2 = getNextCaptureName()
      
      // Should have a number suffix
      expect(name1).toMatch(/-\d+$/)
      expect(name2).toMatch(/-\d+$/)
      // Numbers should be different
      expect(name1).not.toBe(name2)
    })

    it('should return string type', () => {
      const name = getNextCaptureName()
      
      expect(typeof name).toBe('string')
    })

    it('should return non-empty string', () => {
      const name = getNextCaptureName()
      
      expect(name.length).toBeGreaterThan(0)
    })
  })

  describe('resetNameIndex', () => {
    it('should allow reusing all names after reset', () => {
      const firstRound = []
      for (let i = 0; i < 5; i++) {
        firstRound.push(getNextCaptureName())
      }
      
      resetNameIndex()
      
      const secondRound = []
      for (let i = 0; i < 5; i++) {
        secondRound.push(getNextCaptureName())
      }
      
      // All names from second round should be from original pool
      secondRound.forEach(name => {
        expect(CAPTURE_POINT_NAMES).toContain(name)
      })
    })

    it('should clear used names set', () => {
      getNextCaptureName()
      getNextCaptureName()
      getNextCaptureName()
      
      resetNameIndex()
      
      const name = getNextCaptureName()
      expect(CAPTURE_POINT_NAMES).toContain(name)
    })

    it('should not throw when called multiple times', () => {
      expect(() => {
        resetNameIndex()
        resetNameIndex()
        resetNameIndex()
      }).not.toThrow()
    })
  })

  describe('CAPTURE_POINT_NAMES', () => {
    it('should include NATO alphabet names', () => {
      const natoNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']
      
      natoNames.forEach(name => {
        expect(CAPTURE_POINT_NAMES).toContain(name)
      })
    })

    it('should include female operation names', () => {
      const femaleNames = ['Ada', 'Clara', 'Diana', 'Elsa', 'Fiona']
      
      femaleNames.forEach(name => {
        expect(CAPTURE_POINT_NAMES).toContain(name)
      })
    })

    it('should have sufficient names for typical use', () => {
      expect(CAPTURE_POINT_NAMES.length).toBeGreaterThanOrEqual(30)
    })

    it('should contain only strings', () => {
      CAPTURE_POINT_NAMES.forEach(name => {
        expect(typeof name).toBe('string')
      })
    })

    it('should contain only non-empty strings', () => {
      CAPTURE_POINT_NAMES.forEach(name => {
        expect(name.length).toBeGreaterThan(0)
      })
    })

    it('should have no duplicate names', () => {
      const uniqueNames = new Set(CAPTURE_POINT_NAMES)
      expect(uniqueNames.size).toBe(CAPTURE_POINT_NAMES.length)
    })
  })

  describe('Randomness', () => {
    it('should provide different names in different runs', () => {
      resetNameIndex()
      const run1 = []
      for (let i = 0; i < 10; i++) {
        run1.push(getNextCaptureName())
      }
      
      resetNameIndex()
      const run2 = []
      for (let i = 0; i < 10; i++) {
        run2.push(getNextCaptureName())
      }
      
      // With randomness, sequences should differ
      const differences = run1.filter((name, i) => name !== run2[i])
      expect(differences.length).toBeGreaterThan(0)
    })

    it('should distribute names randomly', () => {
      resetNameIndex()
      const distribution = {}
      
      // Sample many times
      for (let i = 0; i < 100; i++) {
        resetNameIndex()
        const name = getNextCaptureName()
        distribution[name] = (distribution[name] || 0) + 1
      }
      
      // Should have reasonable distribution (not all the same name)
      const counts = Object.values(distribution)
      expect(counts.length).toBeGreaterThan(1)
    })
  })
})

