import { POINTS_PER_CAPTURE, POINTS_PER_SECOND } from '~/config/game-config.mjs'

/**
 * Calculate and update scores for all teams based on current game state
 */
export function calculateScores(gameState) {
  if (!gameState.gameActive && !gameState.isActive) return

  const teamPointsThisTick = {}

  // Award points for each capture point held
  gameState.capturePoints.forEach(cp => {
    if (cp.teamId) {
      teamPointsThisTick[cp.teamId] = (teamPointsThisTick[cp.teamId] || 0) + POINTS_PER_SECOND
    }
  })

  // Update team scores
  gameState.teams.forEach(team => {
    if (teamPointsThisTick[team.id]) {
      team.score += teamPointsThisTick[team.id]
    }
  })

  return teamPointsThisTick
}

/**
 * Award capture bonus points to a team
 */
export function awardCaptureBonus(team) {
  team.score += POINTS_PER_CAPTURE
  return POINTS_PER_CAPTURE
}

/**
 * Reset all scores
 */
export function resetScores(gameState) {
  gameState.teams.forEach(team => {
    team.score = 0
  })
}

