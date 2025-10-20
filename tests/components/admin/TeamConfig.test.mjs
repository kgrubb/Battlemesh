import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import TeamConfig from '../../../app/components/admin/TeamConfig.vue'
import { useGameState } from '../../../app/stores/gameState.mjs'

describe('TeamConfig Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render team config header', async () => {
    const wrapper = await mountSuspended(TeamConfig)
    
    expect(wrapper.text()).toContain('TEAM CONFIG')
  })

  it('should have add team button', async () => {
    const wrapper = await mountSuspended(TeamConfig)
    
    expect(wrapper.text()).toContain('ADD TEAM')
  })

  it('should have reset scores button', async () => {
    const wrapper = await mountSuspended(TeamConfig)
    
    expect(wrapper.text()).toContain('RESET SCORES')
  })

  it('should have team name input field', async () => {
    const wrapper = await mountSuspended(TeamConfig)
    
    const input = wrapper.find('input[type="text"]')
    expect(input.exists()).toBe(true)
  })

  it('should have color picker', async () => {
    const wrapper = await mountSuspended(TeamConfig)
    
    const colorInput = wrapper.find('input[type="color"]')
    expect(colorInput.exists()).toBe(true)
  })

  it('should be collapsible', async () => {
    const wrapper = await mountSuspended(TeamConfig)
    const gameState = useGameState()
    
    gameState.nodeMode = 'admin'
    gameState.initializeGame()
    
    // Should have collapse toggle
    const toggleButton = wrapper.find('button')
    expect(toggleButton.exists()).toBe(true)
  })
})
