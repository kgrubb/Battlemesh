/**
 * Input validation utilities
 */

export function validateTeamName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Team name is required' }
  }
  
  const trimmed = name.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Team name cannot be empty' }
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Team name must be 50 characters or less' }
  }
  
  // Allow letters, numbers, spaces, hyphens
  if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
    return { valid: false, error: 'Team name can only contain letters, numbers, spaces, and hyphens' }
  }
  
  return { valid: true, value: trimmed }
}

export function validateTeamColor(color) {
  if (!color || typeof color !== 'string') {
    return { valid: false, error: 'Color is required' }
  }
  
  // Check if valid hex color (#RRGGBB)
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return { valid: false, error: 'Color must be a valid hex code (e.g., #FF0000)' }
  }
  
  return { valid: true, value: color }
}

export function validateGPSCoordinate(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' }
  }
  
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' }
  }
  
  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' }
  }
  
  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Coordinates cannot be NaN' }
  }
  
  return { valid: true, value: { lat, lon } }
}

export function validateTeamId(teamId, teams) {
  // Team ID should be a number
  if (teamId === null || teamId === undefined) {
    return { valid: false, error: 'Team ID is required' }
  }
  
  const id = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId
  
  if (!Number.isInteger(id) || !teams.some(t => t.id === id)) {
    return { valid: false, error: `Team ID '${teamId}' not found` }
  }
  return { valid: true, value: id }
}
