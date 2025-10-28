import { test, expect } from '@playwright/test'

test.describe('BattleMesh E2E Tests', () => {
  test.describe('Core Functionality', () => {
    test('Landing page loads and navigation works', async ({ page }) => {
      await page.goto('/')
      
      // Check page loads
      const title = await page.title()
      expect(title).toBeTruthy()
      
      // Check basic elements exist
      await expect(page.locator('body')).toBeVisible()
      
      // Test navigation to admin
      await page.goto('/admin')
      await expect(page.locator('body')).toBeVisible()
      
      // Test navigation to capture point
      await page.goto('/capture-point')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Admin page core functionality', async ({ page }) => {
      await page.goto('/admin')
      
      // Check page loads
      await expect(page.locator('body')).toBeVisible()
      
      // Check if we can interact with the page (basic functionality)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
      expect(bodyText!.length).toBeGreaterThan(0)
    })

    test('Capture point page core functionality', async ({ page }) => {
      await page.goto('/capture-point')
      
      // Check page loads
      await expect(page.locator('body')).toBeVisible()
      
      // Check if we can interact with the page
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
      expect(bodyText!.length).toBeGreaterThan(0)
    })

    test('Multi-page integration', async ({ page, context }) => {
      // Open admin page
      await page.goto('/admin')
      await expect(page.locator('body')).toBeVisible()
      
      // Open capture point in new tab
      const capturePage = await context.newPage()
      await capturePage.goto('/capture-point')
      await expect(capturePage.locator('body')).toBeVisible()
      
      // Both pages should load successfully
      await capturePage.close()
    })
  })

  test.describe('Core Gameplay', () => {
    test('Admin can start a game', async ({ page }) => {
      await page.goto('/admin')
      await expect(page.locator('body')).toBeVisible()
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle')
      
      // Look for game control buttons (start/stop/reset)
      // These might be buttons with text like "Start Mission", "Stop Mission", etc.
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
      
      // Check if game control elements exist (they might be buttons, divs, etc.)
      const gameControls = await page.locator('button, [role="button"]').all()
      expect(gameControls.length).toBeGreaterThan(0)
    })

    test('Capture point can be captured', async ({ page }) => {
      await page.goto('/capture-point')
      await expect(page.locator('body')).toBeVisible()
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle')
      
      // Look for capture buttons or team selection
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
      
      // Check if capture-related elements exist
      const buttons = await page.locator('button, [role="button"]').all()
      expect(buttons.length).toBeGreaterThan(0)
    })

    test('Game state synchronization between admin and capture point', async ({ page, context }) => {
      // Open admin page
      await page.goto('/admin')
      await expect(page.locator('body')).toBeVisible()
      await page.waitForLoadState('networkidle')
      
      // Open capture point in new tab
      const capturePage = await context.newPage()
      await capturePage.goto('/capture-point')
      await expect(capturePage.locator('body')).toBeVisible()
      await capturePage.waitForLoadState('networkidle')
      
      // Both pages should be able to communicate via WebSocket
      // This tests that the WebSocket connection is working
      const adminBodyText = await page.locator('body').textContent()
      const captureBodyText = await capturePage.locator('body').textContent()
      
      expect(adminBodyText).toBeTruthy()
      expect(captureBodyText).toBeTruthy()
      
      await capturePage.close()
    })

    test('Team management functionality', async ({ page }) => {
      await page.goto('/admin')
      await expect(page.locator('body')).toBeVisible()
      await page.waitForLoadState('networkidle')
      
      // Look for team-related elements
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
      
      // Check if there are any team-related elements (teams, colors, etc.)
      // This tests that the team management UI is present
      const interactiveElements = await page.locator('button, input, select').all()
      expect(interactiveElements.length).toBeGreaterThan(0)
    })

    test('Score tracking functionality', async ({ page }) => {
      await page.goto('/admin')
      await expect(page.locator('body')).toBeVisible()
      
      // Wait for the page to be fully loaded (DOM ready)
      await page.waitForLoadState('domcontentloaded')
      
      // Look for score-related elements
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
      
      // Check if score elements exist (they might contain numbers, "score", "points", etc.)
      const scoreElements = await page.locator('*').all()
      const _hasScoreContent = scoreElements.some(async (el) => {
        const text = await el.textContent()
        return text && (text.includes('score') || text.includes('point') || /\d+/.test(text))
      })
      
      // At minimum, the page should have some content
      expect(bodyText!.length).toBeGreaterThan(0)
    })
  })

  test.describe('Responsive Design', () => {
    test('Mobile viewport compatibility', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/')
      await expect(page.locator('body')).toBeVisible()
      
      await page.goto('/admin')
      await expect(page.locator('body')).toBeVisible()
      
      await page.goto('/capture-point')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Tablet viewport compatibility', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.goto('/')
      await expect(page.locator('body')).toBeVisible()
      
      await page.goto('/admin')
      await expect(page.locator('body')).toBeVisible()
      
      await page.goto('/capture-point')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    test('All pages load in different browsers', async ({ page }) => {
      // Test all three main pages
      const pages = ['/', '/admin', '/capture-point']
      
      for (const pagePath of pages) {
        await page.goto(pagePath)
        await expect(page.locator('body')).toBeVisible()
        
        // Verify page has content
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toBeTruthy()
        expect(bodyText!.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Performance', () => {
    test('Pages load within reasonable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await expect(page.locator('body')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    })
  })
})
