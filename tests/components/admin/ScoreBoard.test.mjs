import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import ScoreBoard from '../../../app/components/admin/ScoreBoard.vue'
import { useGameState } from '../../../app/stores/gameState.mjs'

describe('ScoreBoard Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render scoreboard header', async () => {
    const wrapper = await mountSuspended(ScoreBoard)
    
    expect(wrapper.text()).toContain('SCOREBOARD')
  })

  it('should display teams after initialization', async () => {
    const wrapper = await mountSuspended(ScoreBoard)
    const gameState = useGameState()
    
    gameState.nodeMode = 'admin'
    gameState.initializeGame()
    
    // Wait for reactivity
    await new Promise(resolve => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()
    
    expect(gameState.teams.length).toBeGreaterThan(0)
  })

  it('should show team scores', async () => {
    const wrapper = await mountSuspended(ScoreBoard)
    const gameState = useGameState()
    
    gameState.nodeMode = 'admin'
    gameState.initializeGame()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()
    
    // Should display scores (at least 0)
    expect(wrapper.text()).toMatch(/\d+/)
  })
})
