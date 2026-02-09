const { test, expect } = require('@playwright/test');
const { waitForBookReady } = require('./helpers');
const { SELECTORS } = require('./constants');

test.describe('Smoke Tests - Basic Loading', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('title page shows SQUISHED heading and cover image', async ({ page }) => {
    const heading = page.locator(SELECTORS.bookTitle);
    await expect(heading).toHaveText('SQUISHED');

    const coverImg = page.locator('.title-cover-image');
    await expect(coverImg).toBeVisible();
    await expect(coverImg).toHaveAttribute('src', 'images/harold-happy.png');
  });

  test('page counter shows 1 / N where N > 1', async ({ page }) => {
    const current = page.locator(SELECTORS.currentPage);
    const total = page.locator(SELECTORS.totalPages);

    await expect(current).toHaveText('1');
    const totalNum = parseInt(await total.textContent());
    expect(totalNum).toBeGreaterThan(1);
  });

  test('Next button enabled and Previous button disabled on page 1', async ({ page }) => {
    await expect(page.locator(SELECTORS.prevBtn)).toBeDisabled();
    await expect(page.locator(SELECTORS.nextBtn)).toBeEnabled();
  });

  test('all pages have data-page attributes', async ({ page }) => {
    const pages = page.locator('.page');
    const count = await pages.count();
    expect(count).toBeGreaterThan(1);

    for (let i = 0; i < count; i++) {
      const attr = await pages.nth(i).getAttribute('data-page');
      expect(attr).toBeTruthy();
      expect(parseInt(attr)).toBeGreaterThan(0);
    }
  });

  test('content loads from markdown (more than just fallback title page)', async ({ page }) => {
    // If content-loader works, we should have story pages, endorsement quotes, etc.
    const storyPages = page.locator(SELECTORS.storyPage);
    const storyCount = await storyPages.count();
    expect(storyCount).toBeGreaterThan(0);

    // Should also have an author-note page
    const authorNote = page.locator(SELECTORS.authorNote);
    await expect(authorNote).toHaveCount(1);

    // And endorsement quotes
    const quotesPage = page.locator('.quotes-page');
    await expect(quotesPage).toHaveCount(1);
  });
});
