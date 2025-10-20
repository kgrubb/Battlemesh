import { defineEventHandler } from 'h3'
import { getNatoName } from '../utils/natoIdentity.mjs'

/**
 * API endpoint to get this server's persistent NATO name
 */
export default defineEventHandler(async () => {
  const natoName = await getNatoName()
  
  return {
    natoName,
    timestamp: Date.now()
  }
})

