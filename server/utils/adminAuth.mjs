import { getHeader, createError } from 'h3'
import { getAdminPin } from './gameStateManager.mjs'

/**
 * Middleware to validate admin PIN from request headers
 * Throws 401 error if PIN is missing or invalid
 */
export function requireAdminPin(event) {
  const pin = getHeader(event, 'x-admin-pin')
  const expected = getAdminPin()
  if (!pin || pin !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'invalid admin pin' })
  }
}

