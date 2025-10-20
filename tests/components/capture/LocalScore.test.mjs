import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import LocalScore from '../../../app/components/capture/LocalScore.vue'
import { useGameState } from '../../../app/stores/gameState.mjs'

describe('LocalScore Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render score display', async () => {
    const wrapper = await mountSuspended(LocalScore)
    
    expect(wrapper.text()).toContain('CURRENT SCORES')
  })

  it('should show capture point status', async () => {
    const wrapper = await mountSuspended(LocalScore)
    
    expect(wrapper.text()).toMatch(/THIS POINT|NEUTRAL/)
  })

  it('should work with game state', async () => {
    const wrapper = await mountSuspended(LocalScore)
    const gameState = useGameState()
    
    // Component mounts successfully
    expect(wrapper.exists()).toBe(true)
    // Game state is accessible
    expect(gameState).toBeDefined()
  })

  it('should show neutral status when point is unclaimed', async () => {
    const wrapper = await mountSuspended(LocalScore)
    
    expect(wrapper.text()).toContain('NEUTRAL')
  })
})
