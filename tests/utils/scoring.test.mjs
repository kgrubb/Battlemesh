import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateScores,
  awardCaptureBonus,
  resetScores
} from '../../app/utils/scoring.mjs'

describe('Scoring Utilities', () => {
  let gameState

  beforeEach(() => {
    gameState = {
      gameActive: true,
      teams: [
        { id: 'red', name: 'Red Team', color: '#ef4444', score: 0 },
        { id: 'blue', name: 'Blue Team', color: '#3b82f6', score: 0 }
      ],
      capturePoints: [
        { id: 'cp-1', nodeId: 'node-1', teamId: null, displayName: 'Alpha' },
        { id: 'cp-2', nodeId: 'node-2', teamId: null, displayName: 'Bravo' },
        { id: 'cp-3', nodeId: 'node-3', teamId: null, displayName: 'Charlie' }
      ]
    }
  })

  describe('calculateScores', () => {
    it('should not award points when game is inactive', () => {
      gameState.gameActive = false
      gameState.capturePoints[0].teamId = 'red'
      
      calculateScores(gameState)
      
      expect(gameState.teams[0].score).toBe(0)
    })

    it('should award 1 point per second to team holding one point', () => {
      gameState.capturePoints[0].teamId = 'red'
      
      calculateScores(gameState)
      
      expect(gameState.teams[0].score).toBe(1)
      expect(gameState.teams[1].score).toBe(0)
    })

    it('should award points for multiple capture points', () => {
      gameState.capturePoints[0].teamId = 'red'
      gameState.capturePoints[1].teamId = 'red'
      gameState.capturePoints[2].teamId = 'blue'
      
      calculateScores(gameState)
      
      expect(gameState.teams[0].score).toBe(2) // 2 points held
      expect(gameState.teams[1].score).toBe(1) // 1 point held
    })

    it('should not award points for neutral capture points', () => {
      gameState.capturePoints[0].teamId = null
      gameState.capturePoints[1].teamId = null
      gameState.capturePoints[2].teamId = null
      
      calculateScores(gameState)
      
      expect(gameState.teams[0].score).toBe(0)
      expect(gameState.teams[1].score).toBe(0)
    })

    it('should accumulate scores over multiple ticks', () => {
      gameState.capturePoints[0].teamId = 'red'
      
      calculateScores(gameState)
      expect(gameState.teams[0].score).toBe(1)
      
      calculateScores(gameState)
      expect(gameState.teams[0].score).toBe(2)
      
      calculateScores(gameState)
      expect(gameState.teams[0].score).toBe(3)
    })

    it('should handle team switching capture points', () => {
      gameState.capturePoints[0].teamId = 'red'
      calculateScores(gameState)
      expect(gameState.teams[0].score).toBe(1)
      
      // Switch to blue
      gameState.capturePoints[0].teamId = 'blue'
      calculateScores(gameState)
      
      expect(gameState.teams[0].score).toBe(1) // Red stopped earning
      expect(gameState.teams[1].score).toBe(1) // Blue starts earning
    })

    it('should handle invalid team IDs gracefully', () => {
      gameState.capturePoints[0].teamId = 'invalid-team'
      
      expect(() => calculateScores(gameState)).not.toThrow()
      
      expect(gameState.teams[0].score).toBe(0)
      expect(gameState.teams[1].score).toBe(0)
    })
  })

  describe('awardCaptureBonus', () => {
    it('should award 10 points for successful capture', () => {
      const team = gameState.teams[0]
      awardCaptureBonus(team)
      
      expect(team.score).toBe(10)
    })

    it('should award bonus to correct team', () => {
      const redTeam = gameState.teams[0]
      const blueTeam = gameState.teams[1]
      
      awardCaptureBonus(blueTeam)
      
      expect(redTeam.score).toBe(0)
      expect(blueTeam.score).toBe(10)
    })

    it('should add to existing score', () => {
      const team = gameState.teams[0]
      team.score = 50
      
      awardCaptureBonus(team)
      
      expect(team.score).toBe(60)
    })

    it('should handle multiple captures', () => {
      const redTeam = gameState.teams[0]
      const blueTeam = gameState.teams[1]
      
      awardCaptureBonus(redTeam)
      awardCaptureBonus(redTeam)
      awardCaptureBonus(blueTeam)
      
      expect(redTeam.score).toBe(20)
      expect(blueTeam.score).toBe(10)
    })

    it('should return the bonus amount', () => {
      const team = gameState.teams[0]
      const bonus = awardCaptureBonus(team)
      
      expect(bonus).toBe(10)
    })
  })

  describe('resetScores', () => {
    it('should reset all team scores to zero', () => {
      gameState.teams[0].score = 150
      gameState.teams[1].score = 200
      
      resetScores(gameState)
      
      expect(gameState.teams[0].score).toBe(0)
      expect(gameState.teams[1].score).toBe(0)
    })

    it('should handle empty teams array', () => {
      gameState.teams = []
      
      expect(() => resetScores(gameState)).not.toThrow()
    })

    it('should not affect team properties other than score', () => {
      gameState.teams[0].score = 100
      const originalName = gameState.teams[0].name
      const originalColor = gameState.teams[0].color
      
      resetScores(gameState)
      
      expect(gameState.teams[0].name).toBe(originalName)
      expect(gameState.teams[0].color).toBe(originalColor)
    })

    it('should work with many teams', () => {
      gameState.teams.push(
        { id: 'green', name: 'Green Team', color: '#10b981', score: 75 },
        { id: 'yellow', name: 'Yellow Team', color: '#eab308', score: 125 }
      )
      
      resetScores(gameState)
      
      expect(gameState.teams.every(t => t.score === 0)).toBe(true)
    })
  })

  describe('Integration - Full scoring cycle', () => {
    it('should handle complete game scenario', () => {
      const redTeam = gameState.teams[0]
      const blueTeam = gameState.teams[1]
      
      // Capture points
      gameState.capturePoints[0].teamId = 'red'
      awardCaptureBonus(redTeam) // +10
      
      gameState.capturePoints[1].teamId = 'blue'
      awardCaptureBonus(blueTeam) // +10
      
      // Time passes (3 ticks)
      calculateScores(gameState) // Red +1, Blue +1
      calculateScores(gameState) // Red +1, Blue +1
      calculateScores(gameState) // Red +1, Blue +1
      
      expect(redTeam.score).toBe(13) // 10 + 3
      expect(blueTeam.score).toBe(13) // 10 + 3
      
      // Blue captures another point
      gameState.capturePoints[2].teamId = 'blue'
      awardCaptureBonus(blueTeam) // +10
      
      calculateScores(gameState) // Red +1, Blue +2
      
      expect(redTeam.score).toBe(14)
      expect(blueTeam.score).toBe(25)
    })
  })
})

