import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import AdminDashboard from '../../../app/components/admin/AdminDashboard.vue'
import { useGameState } from '../../../app/stores/gameState.mjs'

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render mission control header', async () => {
    const wrapper = await mountSuspended(AdminDashboard)
    
    expect(wrapper.text()).toContain('MISSION CONTROL')
  })

  it('should show game status', async () => {
    const wrapper = await mountSuspended(AdminDashboard)
    
    expect(wrapper.text()).toMatch(/STANDBY|ACTIVE/)
  })

  it('should have start/stop button', async () => {
    const wrapper = await mountSuspended(AdminDashboard)
    
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should show node count', async () => {
    const wrapper = await mountSuspended(AdminDashboard)
    
    expect(wrapper.text()).toContain('NODES')
  })

  it('should start game when button clicked', async () => {
    const wrapper = await mountSuspended(AdminDashboard)
    const gameState = useGameState()
    
    gameState.nodeMode = 'admin'
    gameState.initializeGame()
    
    await wrapper.vm.$nextTick()
    
    const startButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('START')
    )
    
    if (startButton) {
      expect(gameState.gameActive).toBe(false)
      await startButton.trigger('click')
      expect(gameState.gameActive).toBe(true)
    }
  })
})
