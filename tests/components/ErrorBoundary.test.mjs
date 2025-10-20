import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorBoundary from '../../app/components/ErrorBoundary.vue'

describe('ErrorBoundary Component', () => {
  it('should render children when no error', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: 'Test Content'
      }
    })
    
    expect(wrapper.text()).toContain('Test Content')
  })

  it('should have error state property', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: 'Content'
      }
    })
    
    expect(wrapper.vm.error).toBe(null)
  })

  it('should show error message when error is set', async () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        componentName: 'Test Component'
      },
      slots: {
        default: 'Content'
      }
    })
    
    // Manually trigger error
    wrapper.vm.error = new Error('Test error message')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('SYSTEM ERROR')
    expect(wrapper.text()).toContain('Test error message')
  })

  it('should show reload button when error occurs', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: 'Content'
      }
    })
    
    wrapper.vm.error = new Error('Test error')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('RELOAD')
  })

  it('should display component name in error', async () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        componentName: 'Admin Panel'
      },
      slots: {
        default: 'Content'
      }
    })
    
    wrapper.vm.error = new Error('Test')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('Admin Panel')
  })
})
