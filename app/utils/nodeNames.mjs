/**
 * NATO phonetic alphabet and operation names for capture points
 * Client-side re-export from server utilities
 */

// Re-export from server for client-side use
// This avoids code duplication while keeping the logic server-side
export { CAPTURE_POINT_NAMES, getNextCaptureName, resetNameIndex } from '../../server/utils/nodeNames.mjs'

