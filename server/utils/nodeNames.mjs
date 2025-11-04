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
  const availableNames = CAPTURE_POINT_NAMES.filter(name => !usedNames.has(name))
  
  if (availableNames.length === 0) {
    const counter = (usedNames.size - CAPTURE_POINT_NAMES.length) + 1
    const baseName = CAPTURE_POINT_NAMES[Math.floor(Math.random() * CAPTURE_POINT_NAMES.length)]
    const name = `${baseName}-${counter}`
    usedNames.add(name)
    return name
  }
  
  const name = availableNames[Math.floor(Math.random() * availableNames.length)]
  usedNames.add(name)
  return name
}

export function resetNameIndex() {
  usedNames.clear()
}

export const isNatoNameAvailable = natoName => !usedNames.has(natoName)
export const markNatoNameAsUsed = natoName => usedNames.add(natoName)

