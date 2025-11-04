import { describe, it, expect, beforeEach } from 'vitest'
import * as stateManager from '../../server/utils/gameStateManager.mjs'
import { resetNameIndex, getNextCaptureName, markNatoNameAsUsed } from '../../server/utils/nodeNames.mjs'

describe('Admin-Capture Point Synchronization (SSE)', () => {
  beforeEach(async () => {
    await stateManager.clearState()
    await stateManager.initialize()
    resetNameIndex()
  })

  it('should synchronize capture points between admin and capture point nodes', async () => {
    // Register capture point 1
    const cp1Name = getNextCaptureName()
    stateManager.assignNatoName(cp1Name)
    markNatoNameAsUsed(cp1Name)
    
    // Register capture point 2
    const cp2Name = getNextCaptureName()
    stateManager.assignNatoName(cp2Name)
    markNatoNameAsUsed(cp2Name)
    
    // Verify server state has both capture points
    const serverState = stateManager.getState()
    expect(serverState.capturePoints).toHaveLength(2)
    expect(serverState.capturePoints.map(cp => cp.id)).toEqual(
      expect.arrayContaining([cp1Name, cp2Name])
    )
  })
  
  it('should handle capture point registration and re-registration', async () => {
    // Register capture point (gets NATO name)
    const assignedName = getNextCaptureName()
    stateManager.assignNatoName(assignedName)
    markNatoNameAsUsed(assignedName)
    
    // Verify capture point was created
    let serverState = stateManager.getState()
    expect(serverState.capturePoints).toHaveLength(1)
    expect(serverState.capturePoints[0].id).toBe(assignedName)
    
    // Re-register with same name (should update lastSeen)
    stateManager.updateNatoNameLastSeen(assignedName)
    
    // Verify capture point still exists
    serverState = stateManager.getState()
    expect(serverState.capturePoints).toHaveLength(1)
    expect(serverState.capturePoints[0].id).toBe(assignedName)
  })
  
  it('should handle node disconnection', async () => {
    // Register capture point
    const cpName = getNextCaptureName()
    stateManager.assignNatoName(cpName)
    markNatoNameAsUsed(cpName)
    
    // Verify capture point exists
    let serverState = stateManager.getState()
    expect(serverState.capturePoints).toHaveLength(1)
    
    // Release NATO name (simulating disconnection)
    stateManager.releaseNatoName(cpName)
    
    // Verify capture point was removed
    serverState = stateManager.getState()
    expect(serverState.capturePoints).toHaveLength(0)
  })
})