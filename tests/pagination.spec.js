const { test, expect } = require('@playwright/test');
const { waitForBookReady, goToScreen, goToLastScreen } = require('./helpers');
const { SELECTORS } = require('./constants');

test.describe('Pagination & Content', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('story pages show visible paragraphs', async ({ page }) => {
    // Go to the first story page (after title and quotes = screen 3)
    await goToScreen(page, 3);

    const activePage = page.locator(SELECTORS.activeContent);
    const visibleParagraphs = activePage.locator(SELECTORS.visibleParagraphs);
    const count = await visibleParagraphs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('navigating to second screen shows different content than first', async ({ page }) => {
    // Go to screen 3 (first story screen)
    await goToScreen(page, 3);
    const firstScreenText = await page.locator(SELECTORS.activeContent).textContent();

    // Go to screen 4
    await goToScreen(page, 4);
    const secondScreenText = await page.locator(SELECTORS.activeContent).textContent();

    // Content should be different (different screen of story)
    expect(secondScreenText).not.toBe(firstScreenText);
  });

  test('One Last Thing section has visible section title', async ({ page }) => {
    // Search backwards from the end — ending page is near the end of the book
    const total = parseInt(await page.locator(SELECTORS.totalPages).textContent());
    await goToLastScreen(page);

    let found = false;
    for (let i = total; i >= 1; i--) {
      await goToScreen(page, i);
      const isEndingPage = await page.locator(`${SELECTORS.activePage} ${SELECTORS.endingPage}`).count();
      if (isEndingPage > 0) {
        const title = page.locator(`${SELECTORS.activePage} ${SELECTORS.endingPage} ${SELECTORS.sectionTitle}`);
        await expect(title).toBeVisible();
        await expect(title).toContainText('ONE LAST THING');
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('A Note From Clarke section title visible on its first screen', async ({ page }) => {
    // Search backwards from the end to find the first screen of the author note section
    const total = parseInt(await page.locator(SELECTORS.totalPages).textContent());
    await goToLastScreen(page);

    let firstAuthorNoteScreen = -1;
    for (let i = total; i >= 1; i--) {
      await goToScreen(page, i);
      const isAuthorNote = await page.locator(`${SELECTORS.activePage} ${SELECTORS.authorNote}`).count();
      if (isAuthorNote > 0) {
        firstAuthorNoteScreen = i; // Keep going backwards to find the lowest screen number
      } else if (firstAuthorNoteScreen > 0) {
        break; // We've passed the author note section — stop
      }
    }

    expect(firstAuthorNoteScreen).toBeGreaterThan(0);

    // Navigate to the first screen of the author note and verify title
    await goToScreen(page, firstAuthorNoteScreen);
    const title = page.locator(`${SELECTORS.activePage} ${SELECTORS.authorNote} ${SELECTORS.sectionTitle}`);
    await expect(title).toBeVisible();
    await expect(title).toContainText("A NOTE FROM CLARKE");
  });

  test('continuation indicators and visible content on every screen', async ({ page }) => {
    // Single loop through all screens checking both:
    // 1. Continuation indicator appears on multi-screen pages but not on last screen
    // 2. Every screen shows at least one visible piece of content
    const total = parseInt(await page.locator(SELECTORS.totalPages).textContent());

    let foundContinuation = false;
    let lastScreenHadContinuation = false;

    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);

      // Check continuation indicator
      const continuation = page.locator(`${SELECTORS.activePage} ${SELECTORS.pageContinuation}`);
      const hasContinuation = await continuation.count() > 0;

      if (hasContinuation) {
        foundContinuation = true;
      }

      if (i === total) {
        lastScreenHadContinuation = hasContinuation;
      }

      // Check visible content
      const pageContent = page.locator(SELECTORS.activeContent);

      const visibleContent = await pageContent.evaluate(el => {
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

      expect(visibleContent, `Screen ${i} should have visible content`).toBe(true);
    }

    // Should have found at least one continuation indicator
    expect(foundContinuation).toBe(true);
    // Last screen should NOT have a continuation indicator
    expect(lastScreenHadContinuation).toBe(false);
  });
});
