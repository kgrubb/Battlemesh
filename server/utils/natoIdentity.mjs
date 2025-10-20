import { promises as fs } from 'fs'
import { getNextCaptureName } from './nodeNames.mjs'

/**
 * Server-side NATO name identity manager
 * Ensures each server has a persistent NATO name that survives restarts
 */

// Use port-based NATO name file for multi-instance support on same machine
const PORT = process.env.PORT || '3000'
const NATO_NAME_FILE = process.env.NATO_NAME_FILE || `.battlemesh-node-${PORT}`

let cachedNatoName = null

/**
 * Get or create persistent NATO name for this server
 */
export async function getNatoName() {
  if (cachedNatoName) {
    return cachedNatoName
  }

  try {
    // Try to read existing NATO name
    const data = await fs.readFile(NATO_NAME_FILE, 'utf-8')
    cachedNatoName = data.trim()
    console.log('[NatoIdentity] ✓ Loaded existing NATO name:', cachedNatoName)
    return cachedNatoName
  } catch (err) {
    if (err.code === 'ENOENT') {
      // No file exists, assign new NATO name
      cachedNatoName = getNextCaptureName()
      await fs.writeFile(NATO_NAME_FILE, cachedNatoName, 'utf-8')
      console.log('[NatoIdentity] ✓ Assigned new NATO name:', cachedNatoName)
      return cachedNatoName
    }
    throw err
  }
}

/**
 * Reset NATO name (forces new name on next get)
 */
export async function resetNatoName() {
  try {
    await fs.unlink(NATO_NAME_FILE)
    cachedNatoName = null
    console.log('[NatoIdentity] ✓ NATO name reset')
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('[NatoIdentity] ✗ Error resetting NATO name:', err)
    }
  }
}

