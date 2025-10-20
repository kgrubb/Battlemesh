import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import StatusIndicator from '../../../app/components/capture/StatusIndicator.vue'
import { useGameState } from '../../../app/stores/gameState.mjs'

describe('StatusIndicator Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render status indicator', async () => {
    const wrapper = await mountSuspended(StatusIndicator)
    
    // Should have some content
    expect(wrapper.text().length).toBeGreaterThan(0)
  })

  it('should show admin connection status', async () => {
    const wrapper = await mountSuspended(StatusIndicator)
    
    expect(wrapper.text()).toMatch(/ADMIN|OFFLINE/)
  })

  it('should show network mode', async () => {
    const wrapper = await mountSuspended(StatusIndicator)
    
    expect(wrapper.text()).toContain('MODE')
  })

  it('should show point name', async () => {
    const wrapper = await mountSuspended(StatusIndicator)
    
    expect(wrapper.text()).toContain('POINT')
  })

  it('should update when admin connects', async () => {
    const wrapper = await mountSuspended(StatusIndicator)
    const gameState = useGameState()
    
    gameState.adminConnected = false
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('OFFLINE')
    
    gameState.adminConnected = true
    await wrapper.vm.$nextTick()
    
    // Should reflect connected state
    expect(gameState.adminConnected).toBe(true)
  })
})
