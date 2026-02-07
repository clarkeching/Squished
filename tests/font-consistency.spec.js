const { test, expect } = require('@playwright/test');
const { waitForBookReady, goToScreen } = require('./helpers');
const { SELECTORS } = require('./constants');

test.describe('Font Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('story, ending, and author note pages have same paragraph font-size and font-family', async ({ page }) => {
    // Wait for fonts to load before measuring
    await page.evaluate(() => document.fonts.ready);

    // Collect font properties from each page type in a single loop
    const fontData = {};
    const total = parseInt(await page.locator(SELECTORS.totalPages).textContent());

    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);

      const activeContent = page.locator(SELECTORS.activeContent);
      const classes = await activeContent.evaluate(el => ({
        isStory: el.classList.contains('story-page'),
        isEnding: el.classList.contains('ending-page'),
        isAuthorNote: el.classList.contains('author-note'),
      }));

      let type = null;
      if (classes.isStory) type = 'story';
      else if (classes.isEnding) type = 'ending';
      else if (classes.isAuthorNote) type = 'authorNote';

      if (type && !fontData[type]) {
        const paragraph = activeContent.locator(SELECTORS.visibleParagraphs).first();
        if (await paragraph.count() > 0) {
          const props = await paragraph.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return { fontSize: computed.fontSize, fontFamily: computed.fontFamily };
          });
          fontData[type] = props;
        }
      }

      // Stop early if we have all three
      if (fontData.story && fontData.ending && fontData.authorNote) break;
    }

    // All three page types should exist
    expect(fontData.story).toBeTruthy();
    expect(fontData.ending).toBeTruthy();
    expect(fontData.authorNote).toBeTruthy();

    // Font sizes should match across all page types
    expect(fontData.story.fontSize).toBe(fontData.ending.fontSize);
    expect(fontData.story.fontSize).toBe(fontData.authorNote.fontSize);

    // Font families should match across all page types
    expect(fontData.story.fontFamily).toBe(fontData.ending.fontFamily);
    expect(fontData.story.fontFamily).toBe(fontData.authorNote.fontFamily);
  });

  test('section titles use consistent styling', async ({ page }) => {
    const sectionTitles = page.locator(SELECTORS.sectionTitle);
    const count = await sectionTitles.count();
    expect(count).toBe(2); // One Last Thing + Author's Note

    // Get computed styles for both
    const styles = [];
    for (let i = 0; i < count; i++) {
      const style = await sectionTitles.nth(i).evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          fontSize: computed.fontSize,
          letterSpacing: computed.letterSpacing,
          textAlign: computed.textAlign,
        };
      });
      styles.push(style);
    }

    // Both should have the same styling
    expect(styles[0].fontSize).toBe(styles[1].fontSize);
    expect(styles[0].letterSpacing).toBe(styles[1].letterSpacing);
    expect(styles[0].textAlign).toBe(styles[1].textAlign);
  });

  test('drop cap class exists on first paragraph of first story section', async ({ page }) => {
    const total = parseInt(await page.locator(SELECTORS.totalPages).textContent());

    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);
      const isStory = await page.locator(`${SELECTORS.activePage} ${SELECTORS.storyPage}`).count();
      if (isStory > 0) {
        const firstP = page.locator(`${SELECTORS.activePage} ${SELECTORS.storyPage} p`).first();
        await expect(firstP).toHaveClass(/drop-cap/);
        break;
      }
    }
  });
});
