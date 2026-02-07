const { test, expect } = require('@playwright/test');
const { waitForBookReady, waitForAnimationIdle } = require('./helpers');
const { SELECTORS } = require('./constants');

test.describe('Picture Book Mode', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('mode toggle button is visible', async ({ page }) => {
    const toggle = page.locator(SELECTORS.modeToggle);
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('Picture Mode');
  });

  test('clicking toggle switches to picture mode', async ({ page }) => {
    const toggle = page.locator(SELECTORS.modeToggle);
    await toggle.click();
    await waitForAnimationIdle(page);

    // Toggle should now say "Text Mode"
    await expect(toggle).toHaveText('Text Mode');

    // Should have picture pages in the DOM
    const picturePages = page.locator(SELECTORS.picturePage);
    const count = await picturePages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('navigation works in picture mode', async ({ page }) => {
    // Switch to picture mode
    await page.locator(SELECTORS.modeToggle).click();
    await waitForAnimationIdle(page);

    // Should be on screen 1
    const currentPage = page.locator(SELECTORS.currentPage);
    await expect(currentPage).toHaveText('1');

    // Click next
    await page.locator(SELECTORS.nextBtn).click();
    await waitForAnimationIdle(page);
    await expect(currentPage).toHaveText('2');

    // Click previous
    await page.locator(SELECTORS.prevBtn).click();
    await waitForAnimationIdle(page);
    await expect(currentPage).toHaveText('1');
  });

  test('toggling back to text mode restores text content', async ({ page }) => {
    const toggle = page.locator(SELECTORS.modeToggle);

    // Switch to picture mode
    await toggle.click();
    await waitForAnimationIdle(page);
    await expect(toggle).toHaveText('Text Mode');

    // Switch back to text mode
    await toggle.click();
    await waitForAnimationIdle(page);
    await expect(toggle).toHaveText('Picture Mode');

    // Should have story pages (text mode)
    const storyPages = page.locator(SELECTORS.storyPage);
    const count = await storyPages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('ending page appears in picture mode', async ({ page }) => {
    // Switch to picture mode
    await page.locator(SELECTORS.modeToggle).click();
    await waitForAnimationIdle(page);

    // Navigate to the end
    const total = parseInt(await page.locator(SELECTORS.totalPages).textContent());
    expect(total).toBeGreaterThan(5);

    // Check that ending page exists somewhere in the DOM
    const endingPage = page.locator(SELECTORS.endingPage);
    const count = await endingPage.count();
    expect(count).toBeGreaterThan(0);
  });

  test('page counter is independent between modes', async ({ page }) => {
    const toggle = page.locator(SELECTORS.modeToggle);
    const totalPages = page.locator(SELECTORS.totalPages);

    // Get text mode total
    const textTotal = parseInt(await totalPages.textContent());

    // Switch to picture mode
    await toggle.click();
    await waitForAnimationIdle(page);

    // Get picture mode total
    const pictureTotal = parseInt(await totalPages.textContent());

    // Totals should be different (picture mode has different number of screens)
    expect(textTotal).not.toEqual(pictureTotal);
  });
});
