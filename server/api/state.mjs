import { eventHandler } from 'h3'
import { getState } from '../utils/gameStateManager.mjs'

export default eventHandler(() => {
  const s = getState()
  return {
    teams: s.teams,
    capturePoints: s.capturePoints,
    gameActive: s.gameActive,
    gameStartTime: s.gameStartTime,
    activityFeed: s.activityFeed
  }
})


