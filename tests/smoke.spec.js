const { test, expect } = require('@playwright/test');
const { waitForBookReady } = require('./helpers');

test.describe('Smoke Tests - Basic Loading', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('title page shows SQUISHED heading and shell image', async ({ page }) => {
    const heading = page.locator('.book-title');
    await expect(heading).toHaveText('SQUISHED');

    const shellImg = page.locator('.title-shell');
    await expect(shellImg).toBeVisible();
    await expect(shellImg).toHaveAttribute('src', 'shell.jpg');
  });

  test('page counter shows 1 / N where N > 1', async ({ page }) => {
    const current = page.locator('#currentPage');
    const total = page.locator('#totalPages');

    await expect(current).toHaveText('1');
    const totalNum = parseInt(await total.textContent());
    expect(totalNum).toBeGreaterThan(1);
  });

  test('Next button enabled and Previous button disabled on page 1', async ({ page }) => {
    const prevBtn = page.locator('#prevBtn');
    const nextBtn = page.locator('#nextBtn');

    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();
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
    const storyPages = page.locator('.story-page');
    const storyCount = await storyPages.count();
    expect(storyCount).toBeGreaterThan(0);

    // Should also have an author-note page
    const authorNote = page.locator('.author-note');
    await expect(authorNote).toHaveCount(1);

    // And endorsement quotes
    const quotesPage = page.locator('.quotes-page');
    await expect(quotesPage).toHaveCount(1);
  });
});
