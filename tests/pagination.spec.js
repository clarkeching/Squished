const { test, expect } = require('@playwright/test');
const { waitForBookReady, goToScreen, goToLastScreen } = require('./helpers');

test.describe('Pagination & Content', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('story pages show visible paragraphs', async ({ page }) => {
    // Go to the first story page (after title and quotes = screen 3)
    await goToScreen(page, 3);

    const activePage = page.locator('.page.active .page-content');
    const visibleParagraphs = activePage.locator('p:not(.hidden-overflow):not(.amazon-links p)');
    const count = await visibleParagraphs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('navigating to second screen shows different content than first', async ({ page }) => {
    // Go to screen 3 (first story screen)
    await goToScreen(page, 3);
    const firstScreenText = await page.locator('.page.active .page-content').textContent();

    // Go to screen 4
    await goToScreen(page, 4);
    const secondScreenText = await page.locator('.page.active .page-content').textContent();

    // Content should be different (different screen of story)
    // Note: they might be from the same page but showing different paragraphs,
    // or from different pages entirely
    expect(secondScreenText).not.toBe(firstScreenText);
  });

  test('One Last Thing section has visible section title', async ({ page }) => {
    // Find the ending page
    const total = parseInt(await page.locator('#totalPages').textContent());

    let found = false;
    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);
      const isEndingPage = await page.locator('.page.active .ending-page').count();
      if (isEndingPage > 0) {
        const title = page.locator('.page.active .ending-page .section-title');
        await expect(title).toBeVisible();
        await expect(title).toContainText('ONE LAST THING');
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('Author\'s Note section title visible on its first screen', async ({ page }) => {
    const total = parseInt(await page.locator('#totalPages').textContent());

    let found = false;
    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);
      const isAuthorNote = await page.locator('.page.active .author-note').count();
      if (isAuthorNote > 0) {
        const title = page.locator('.page.active .author-note .section-title');
        await expect(title).toBeVisible();
        await expect(title).toContainText("AUTHOR'S NOTE");
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('continuation indicator appears on multi-screen pages but not on last screen', async ({ page }) => {
    const total = parseInt(await page.locator('#totalPages').textContent());

    // Navigate through all screens looking for continuation indicators
    let foundContinuation = false;
    let lastScreenHadContinuation = false;

    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);
      const continuation = page.locator('.page.active .page-continuation');
      const hasContinuation = await continuation.count() > 0;

      if (hasContinuation) {
        foundContinuation = true;
      }

      if (i === total) {
        lastScreenHadContinuation = hasContinuation;
      }
    }

    // Should have found at least one continuation indicator (book has multi-screen pages)
    expect(foundContinuation).toBe(true);
    // Last screen should NOT have a continuation indicator
    expect(lastScreenHadContinuation).toBe(false);
  });

  test('every screen shows at least one visible paragraph or content', async ({ page }) => {
    const total = parseInt(await page.locator('#totalPages').textContent());

    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);

      const activePage = page.locator('.page.active');
      const pageContent = activePage.locator('.page-content');

      // Should have some visible content - either a title, paragraphs, quotes, or image
      const visibleContent = await pageContent.evaluate(el => {
        // Check for any visible child content
        const children = el.children;
        let hasVisible = false;
        for (const child of children) {
          const style = window.getComputedStyle(child);
          if (style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              !child.classList.contains('hidden-overflow') &&
              child.offsetHeight > 0) {
            hasVisible = true;
            break;
          }
        }
        return hasVisible;
      });

      expect(visibleContent).toBe(true);
    }
  });
});
