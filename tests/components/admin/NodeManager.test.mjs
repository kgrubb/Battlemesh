import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import NodeManager from '../../../app/components/admin/NodeManager.vue'
import { useGameState } from '../../../app/stores/gameState.mjs'

describe('NodeManager Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render node status header', async () => {
    const wrapper = await mountSuspended(NodeManager)
    
    expect(wrapper.text()).toContain('NODE STATUS')
  })

  it('should show no nodes message initially', async () => {
    const wrapper = await mountSuspended(NodeManager)
    
    expect(wrapper.text()).toContain('No nodes connected')
  })

  it('should work with game state', async () => {
    const wrapper = await mountSuspended(NodeManager)
    const gameState = useGameState()
    
    // Component mounts successfully
    expect(wrapper.exists()).toBe(true)
    // Game state is accessible
    expect(gameState).toBeDefined()
  })
})
