const { test, expect } = require('@playwright/test');
const { waitForBookReady, waitForScreenChange, goToScreen, goToLastScreen } = require('./helpers');

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('clicking Next increments page counter', async ({ page }) => {
    await expect(page.locator('#currentPage')).toHaveText('1');
    await page.click('#nextBtn');
    await waitForScreenChange(page, 2);
    await expect(page.locator('#currentPage')).toHaveText('2');
  });

  test('clicking Previous decrements page counter', async ({ page }) => {
    // Go to page 3 first
    await goToScreen(page, 3);
    await expect(page.locator('#currentPage')).toHaveText('3');

    await page.click('#prevBtn');
    await waitForScreenChange(page, 2);
    await expect(page.locator('#currentPage')).toHaveText('2');
  });

  test('Previous disabled on page 1, Next disabled on last page', async ({ page }) => {
    // On page 1
    await expect(page.locator('#prevBtn')).toBeDisabled();
    await expect(page.locator('#nextBtn')).toBeEnabled();

    // Go to last page
    await goToLastScreen(page);
    await expect(page.locator('#nextBtn')).toBeDisabled();
    await expect(page.locator('#prevBtn')).toBeEnabled();
  });

  test('Start button returns to page 1 from any page', async ({ page }) => {
    await goToScreen(page, 5);
    await expect(page.locator('#currentPage')).toHaveText('5');

    await page.click('#startBtn');
    await waitForScreenChange(page, 1);
    await expect(page.locator('#currentPage')).toHaveText('1');
  });

  test('keyboard ArrowRight advances, ArrowLeft goes back', async ({ page }) => {
    await expect(page.locator('#currentPage')).toHaveText('1');

    await page.keyboard.press('ArrowRight');
    await waitForScreenChange(page, 2);
    await expect(page.locator('#currentPage')).toHaveText('2');

    await page.keyboard.press('ArrowLeft');
    await waitForScreenChange(page, 1);
    await expect(page.locator('#currentPage')).toHaveText('1');
  });

  test('site branding click returns to page 1', async ({ page }) => {
    await goToScreen(page, 4);
    await expect(page.locator('#currentPage')).toHaveText('4');

    await page.click('#siteBranding');
    await waitForScreenChange(page, 1);
    await expect(page.locator('#currentPage')).toHaveText('1');
  });
});
