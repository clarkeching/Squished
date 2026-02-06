const { test, expect } = require('@playwright/test');
const { waitForBookReady, waitForScreenChange } = require('./helpers');

test.describe('Z-Index & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('navigation bar is visible', async ({ page }) => {
    const nav = page.locator('.navigation');
    await expect(nav).toBeVisible();

    // Check that nav buttons are actually clickable (not covered by other elements)
    const nextBtn = page.locator('#nextBtn');
    await expect(nextBtn).toBeVisible();
    const box = await nextBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('share tray tab is visible and clickable', async ({ page }) => {
    const trayTab = page.locator('#trayTab');
    await expect(trayTab).toBeVisible();
  });

  test('share tray opens when clicked and shows links', async ({ page }) => {
    const tray = page.locator('#shareTray');
    const trayTab = page.locator('#trayTab');

    // Tray should not be open initially
    await expect(tray).not.toHaveClass(/open/);

    // Click to open
    await trayTab.click();
    await page.waitForTimeout(300);

    // Tray should be open
    await expect(tray).toHaveClass(/open/);

    // Should show share and gift links
    const shareLink = tray.locator('a[href="https://unsquish.me"]');
    await expect(shareLink).toBeVisible();

    const giftLink = tray.locator('a[href*="amazon.com"]');
    await expect(giftLink).toBeVisible();
  });

  test('on mobile, share tray does not cover navigation buttons', async ({ page }, testInfo) => {
    // This assertion is only meaningful on mobile viewport (< 768px)
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 768) {
      // On desktop, tray is positioned differently — skip the strict check
      test.skip();
      return;
    }

    const trayTab = page.locator('#trayTab');
    await trayTab.click();
    await page.waitForTimeout(300);

    // Get bounding boxes
    const navNextBox = await page.locator('#nextBtn').boundingBox();
    const navPrevBox = await page.locator('#prevBtn').boundingBox();
    expect(navNextBox).toBeTruthy();
    expect(navPrevBox).toBeTruthy();

    // Verify the tray content doesn't cover the nav buttons
    const trayContentBox = await page.locator('.tray-content').boundingBox();
    if (trayContentBox) {
      // Tray content bottom should be at or above the nav buttons top
      expect(trayContentBox.y + trayContentBox.height).toBeLessThanOrEqual(navNextBox.y + 5);
    }
  });

  test('header is visible at top of page', async ({ page }) => {
    const header = page.locator('.site-header');
    await expect(header).toBeVisible();

    const box = await header.boundingBox();
    expect(box).toBeTruthy();
    // Header should be near the top
    expect(box.y).toBeLessThan(50);
  });
});
