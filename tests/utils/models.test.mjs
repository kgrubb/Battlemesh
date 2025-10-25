import { describe, it, expect } from 'vitest'
import {
  createTeam,
  createCapturePoint,
  createNode
} from '../../app/utils/models.mjs'

describe('Model Creation Utilities', () => {
  describe('createTeam', () => {
    it('should create team with correct structure', () => {
      const team = createTeam('red', 'Red Team', '#ef4444')
      
      expect(team).toHaveProperty('id', 'red')
      expect(team).toHaveProperty('name', 'Red Team')
      expect(team).toHaveProperty('color', '#ef4444')
      expect(team).toHaveProperty('score', 0)
    })

    it('should initialize score to zero', () => {
      const team = createTeam('blue', 'Blue Team', '#3b82f6')
      
      expect(team.score).toBe(0)
    })

    it('should preserve all provided values', () => {
      const team = createTeam('custom-id', 'Custom Name', '#123456')
      
      expect(team.id).toBe('custom-id')
      expect(team.name).toBe('Custom Name')
      expect(team.color).toBe('#123456')
    })
  })

  describe('createCapturePoint', () => {
    it('should create capture point with correct structure', () => {
      const cp = createCapturePoint('Alpha', null)
      
      expect(cp).toHaveProperty('id', 'Alpha') // NATO name is the ID
      expect(cp).toHaveProperty('teamId', null)
      expect(cp).toHaveProperty('position', null)
      expect(cp).toHaveProperty('staticPosition', null)
      expect(cp).toHaveProperty('useStaticPosition', false)
      expect(cp).toHaveProperty('lastCaptureTime', null)
      expect(cp).toHaveProperty('totalCaptures', 0)
    })

    it('should use NATO name as ID', () => {
      const cp = createCapturePoint('Bravo', null)
      
      expect(cp.id).toBe('Bravo')
    })

    it('should accept position coordinates', () => {
      const position = { lat: 37.7749, lon: -122.4194 }
      const cp = createCapturePoint('Charlie', position)
      
      expect(cp.position).toEqual(position)
      expect(cp.id).toBe('Charlie')
    })

    it('should initialize counters to zero/null', () => {
      const cp = createCapturePoint('Delta', null)
      
      expect(cp.totalCaptures).toBe(0)
      expect(cp.lastCaptureTime).toBe(null)
      expect(cp.teamId).toBe(null)
    })
  })

  describe('createNode', () => {
    it('should create admin node with correct structure', () => {
      const node = createNode('admin-1', 'admin')
      
      expect(node).toHaveProperty('id', 'admin-1')
      expect(node).toHaveProperty('mode', 'admin')
      expect(node).toHaveProperty('position', null)
      expect(node).toHaveProperty('status', 'online')
      expect(node).toHaveProperty('lastSeen')
    })

    it('should create capture-point node', () => {
      const node = createNode('node-1', 'capture-point')
      
      expect(node.id).toBe('node-1')
      expect(node.mode).toBe('capture-point')
    })

    it('should set status to online by default', () => {
      const node = createNode('node-1', 'capture-point')
      
      expect(node.status).toBe('online')
    })

    it('should set lastSeen to current timestamp', () => {
      const before = Date.now()
      const node = createNode('node-1', 'capture-point')
      const after = Date.now()
      
      expect(node.lastSeen).toBeGreaterThanOrEqual(before)
      expect(node.lastSeen).toBeLessThanOrEqual(after)
    })

    it('should initialize position as null', () => {
      const node = createNode('node-1', 'capture-point')
      
      expect(node.position).toBe(null)
    })
  })

  describe('Model Integrity', () => {
    it('should create immutable-like objects', () => {
      const team = createTeam('red', 'Red Team', '#ef4444')
      const originalScore = team.score
      
      // Objects are mutable in JS, but structure should be correct
      team.score = 100
      expect(team.score).toBe(100)
      expect(originalScore).toBe(0)
    })

    it('should handle null values appropriately', () => {
      const cp = createCapturePoint('Echo', null)
      
      expect(cp.position).toBe(null)
      expect(cp.id).toBe('Echo')
      expect(cp.teamId).toBe(null)
    })
  })
})

