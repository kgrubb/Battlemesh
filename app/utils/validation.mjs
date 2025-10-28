/**
 * Input validation utilities
 */

export function validateTeamName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Team name is required' }
  }
  
  const trimmed = name.trim()
  if (!trimmed) {
    return { valid: false, error: 'Team name cannot be empty' }
  }
  
  if (trimmed.length < 1 || trimmed.length > 50) {
    return { valid: false, error: 'Team name must be between 1 and 50 characters' }
  }
  
  if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
    return { valid: false, error: 'Team name can only contain letters, numbers, spaces, and hyphens' }
  }
  
  return { valid: true, value: trimmed }
}

export function validateTeamColor(color) {
  if (!color || typeof color !== 'string') {
    return { valid: false, error: 'Color is required' }
  }
  
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return { valid: false, error: 'Color must be a valid hex code (e.g., #FF0000)' }
  }
  
  return { valid: true, value: color }
}

export function validateGPSCoordinate(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Coordinates must be valid numbers' }
  }
  
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' }
  }
  
  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' }
  }
  
  return { valid: true, value: { lat, lon } }
}

export function validateTeamId(teamId, teams) {
  if (teamId === null || teamId === undefined) {
    return { valid: false, error: 'Team ID is required' }
  }
  
  const id = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId
  
  if (!Number.isInteger(id) || !teams.some(t => t.id === id)) {
    return { valid: false, error: `Team ID '${teamId}' not found` }
  }
  return { valid: true, value: id }
}
