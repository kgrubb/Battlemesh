import { eventHandler } from 'h3'
import { getAdminPin } from '../utils/gameStateManager.mjs'

// Endpoint to get the admin PIN (for testing purposes only)
// Only available in dev/test mode
export default eventHandler(() => {
  // Only allow in dev/test environments
  if (process.env.NODE_ENV === 'production' && !process.env.TEST_ADMIN_PIN) {
    return { error: 'Not available in production' }
  }
  
  return { pin: getAdminPin() }
})

