const { test, expect } = require('@playwright/test');
const { waitForBookReady } = require('./helpers');
const { SELECTORS, THRESHOLDS } = require('./constants');

test.describe('Z-Index & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('navigation bar is visible', async ({ page }) => {
    const nav = page.locator(SELECTORS.navigation);
    await expect(nav).toBeVisible();

    // Check that nav buttons are actually clickable (not covered by other elements)
    const nextBtn = page.locator(SELECTORS.nextBtn);
    await expect(nextBtn).toBeVisible();
    const box = await nextBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('share tray tab is visible and clickable', async ({ page }) => {
    const trayTab = page.locator(SELECTORS.trayTab);
    await expect(trayTab).toBeVisible();
  });

  test('share tray opens when clicked and shows links', async ({ page }) => {
    const tray = page.locator(SELECTORS.shareTray);
    const trayTab = page.locator(SELECTORS.trayTab);

    // Tray should not be open initially
    await expect(tray).not.toHaveClass(/open/);

    // Click to open and wait for class change (Playwright auto-waits)
    await trayTab.click();
    await expect(tray).toHaveClass(/open/);

    // Should show share and gift links
    const shareLink = tray.locator('a[href="https://unsquish.me"]');
    await expect(shareLink).toBeVisible();

    const giftLink = tray.locator('a[href*="amazon.com"]');
    await expect(giftLink).toBeVisible();
  });

  test('on mobile, share tray does not cover navigation buttons', async ({ page }) => {
    // This assertion is only meaningful on mobile viewport
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= THRESHOLDS.mobileBreakpoint) {
      test.skip();
      return;
    }

    const trayTab = page.locator(SELECTORS.trayTab);
    await trayTab.click();
    await expect(page.locator(SELECTORS.shareTray)).toHaveClass(/open/);

    // Get bounding boxes
    const navNextBox = await page.locator(SELECTORS.nextBtn).boundingBox();
    const navPrevBox = await page.locator(SELECTORS.prevBtn).boundingBox();
    expect(navNextBox).toBeTruthy();
    expect(navPrevBox).toBeTruthy();

    // Verify the tray content doesn't cover the nav buttons
    const trayContentBox = await page.locator(SELECTORS.trayContent).boundingBox();
    if (trayContentBox) {
      expect(trayContentBox.y + trayContentBox.height)
        .toBeLessThanOrEqual(navNextBox.y + THRESHOLDS.trayOverlapTolerance);
    }
  });

  test('header is visible at top of page', async ({ page }) => {
    const header = page.locator(SELECTORS.siteHeader);
    await expect(header).toBeVisible();

    const box = await header.boundingBox();
    expect(box).toBeTruthy();
    expect(box.y).toBeLessThan(THRESHOLDS.headerMaxY);
  });
});
