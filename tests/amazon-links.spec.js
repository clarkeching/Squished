const { test, expect } = require('@playwright/test');
const { waitForBookReady, goToLastScreen, goToScreen } = require('./helpers');
const { SELECTORS } = require('./constants');

test.describe('Book Coming Soon', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('Author\'s Note page contains "Book coming soon" message', async ({ page }) => {
    const amazonLinks = page.locator(SELECTORS.amazonLinks);
    await expect(amazonLinks).toHaveCount(1);

    // Should show "Book coming soon…" instead of Amazon links
    await expect(amazonLinks).toContainText('Book coming soon');

    // Should NOT contain any Amazon links
    const links = amazonLinks.locator('a[href*="amazon"]');
    await expect(links).toHaveCount(0);
  });

  test('"Book coming soon" visible on last screen', async ({ page }) => {
    await goToLastScreen(page);

    const amazonLinks = page.locator(SELECTORS.amazonLinks);
    await expect(amazonLinks).not.toHaveClass(/hidden-overflow/);
    await expect(amazonLinks).toBeVisible();
    await expect(amazonLinks).toContainText('Book coming soon');
  });
});
