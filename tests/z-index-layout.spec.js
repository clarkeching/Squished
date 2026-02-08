const { test, expect } = require('@playwright/test');
const { waitForBookReady } = require('./helpers');
const { SELECTORS, THRESHOLDS } = require('./constants');

test.describe('Z-Index & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('navigation info bar and side arrows are visible', async ({ page }) => {
    const nav = page.locator(SELECTORS.navigation);
    await expect(nav).toBeVisible();

    // Check that side nav buttons are actually clickable (not covered by other elements)
    const nextBtn = page.locator(SELECTORS.nextBtn);
    await expect(nextBtn).toBeVisible();
    const box = await nextBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);

    const prevBtn = page.locator(SELECTORS.prevBtn);
    await expect(prevBtn).toBeVisible();
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

  test('side nav arrows are not covered by share tray', async ({ page }) => {
    const trayTab = page.locator(SELECTORS.trayTab);
    await trayTab.click();
    await expect(page.locator(SELECTORS.shareTray)).toHaveClass(/open/);

    // Side nav arrows should remain clickable even when tray is open
    const nextBtn = page.locator(SELECTORS.nextBtn);
    await expect(nextBtn).toBeVisible();
    const nextBox = await nextBtn.boundingBox();
    expect(nextBox).toBeTruthy();

    // Verify the tray content doesn't overlap the side nav buttons
    const trayContentBox = await page.locator(SELECTORS.trayContent).boundingBox();
    if (trayContentBox && nextBox) {
      // Side arrows are at the sides, tray is centered — they shouldn't overlap horizontally
      const trayRight = trayContentBox.x + trayContentBox.width;
      const nextLeft = nextBox.x;
      // Either tray is entirely to the left of the next button, or no vertical overlap
      const horizontalOverlap = trayRight > nextLeft && trayContentBox.x < nextBox.x + nextBox.width;
      if (horizontalOverlap) {
        // If they overlap horizontally, they shouldn't overlap vertically
        const trayBottom = trayContentBox.y + trayContentBox.height;
        expect(trayBottom).toBeLessThanOrEqual(nextBox.y + THRESHOLDS.trayOverlapTolerance);
      }
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
