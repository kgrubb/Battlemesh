/**
 * NATO phonetic alphabet and operation names for capture points
 */

export const CAPTURE_POINT_NAMES = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliet',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
  'Uniform',
  'Victor',
  'Whiskey',
  'Xray',
  'Yankee',
  'Zulu',
  'Ada',
  'Clara',
  'Diana',
  'Elsa',
  'Fiona',
  'Greta',
  'Iris',
  'Nina',
  'Sonia',
  'Zara'
]

const usedNames = new Set()

export function getNextCaptureName() {
  // Get available names (not yet used)
  const availableNames = CAPTURE_POINT_NAMES.filter(name => !usedNames.has(name))
  
  if (availableNames.length === 0) {
    // All names used, start numbering them
    const baseName = CAPTURE_POINT_NAMES[Math.floor(Math.random() * CAPTURE_POINT_NAMES.length)]
    const suffix = Math.floor(usedNames.size / CAPTURE_POINT_NAMES.length) + 1
    const name = `${baseName}-${suffix}`
    usedNames.add(name)
    return name
  }
  
  // Randomly select from available names
  const randomIndex = Math.floor(Math.random() * availableNames.length)
  const name = availableNames[randomIndex]
  usedNames.add(name)
  return name
}

export function resetNameIndex() {
  usedNames.clear()
}
