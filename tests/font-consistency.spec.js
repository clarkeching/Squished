const { test, expect } = require('@playwright/test');
const { waitForBookReady, goToScreen } = require('./helpers');

test.describe('Font Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('story, ending, and author note pages have same paragraph font-size', async ({ page }) => {
    // Collect font sizes from each page type
    const fontSizes = {};

    const total = parseInt(await page.locator('#totalPages').textContent());

    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);

      const activeContent = page.locator('.page.active .page-content');
      const classes = await activeContent.evaluate(el => {
        return {
          isStory: el.classList.contains('story-page'),
          isEnding: el.classList.contains('ending-page'),
          isAuthorNote: el.classList.contains('author-note'),
        };
      });

      let type = null;
      if (classes.isStory) type = 'story';
      else if (classes.isEnding) type = 'ending';
      else if (classes.isAuthorNote) type = 'authorNote';

      if (type && !fontSizes[type]) {
        // Get font-size of the first visible paragraph
        const paragraph = activeContent.locator('p:not(.hidden-overflow):not(.amazon-links p)').first();
        if (await paragraph.count() > 0) {
          const fontSize = await paragraph.evaluate(el => window.getComputedStyle(el).fontSize);
          fontSizes[type] = fontSize;
        }
      }

      // Stop early if we have all three
      if (fontSizes.story && fontSizes.ending && fontSizes.authorNote) break;
    }

    // All three should exist
    expect(fontSizes.story).toBeTruthy();
    expect(fontSizes.ending).toBeTruthy();
    expect(fontSizes.authorNote).toBeTruthy();

    // All three should be the same
    expect(fontSizes.story).toBe(fontSizes.ending);
    expect(fontSizes.story).toBe(fontSizes.authorNote);
  });

  test('story, ending, and author note pages have same paragraph font-family', async ({ page }) => {
    const fontFamilies = {};
    const total = parseInt(await page.locator('#totalPages').textContent());

    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);

      const activeContent = page.locator('.page.active .page-content');
      const classes = await activeContent.evaluate(el => ({
        isStory: el.classList.contains('story-page'),
        isEnding: el.classList.contains('ending-page'),
        isAuthorNote: el.classList.contains('author-note'),
      }));

      let type = null;
      if (classes.isStory) type = 'story';
      else if (classes.isEnding) type = 'ending';
      else if (classes.isAuthorNote) type = 'authorNote';

      if (type && !fontFamilies[type]) {
        const paragraph = activeContent.locator('p:not(.hidden-overflow):not(.amazon-links p)').first();
        if (await paragraph.count() > 0) {
          const fontFamily = await paragraph.evaluate(el => window.getComputedStyle(el).fontFamily);
          fontFamilies[type] = fontFamily;
        }
      }

      if (fontFamilies.story && fontFamilies.ending && fontFamilies.authorNote) break;
    }

    expect(fontFamilies.story).toBeTruthy();
    expect(fontFamilies.ending).toBeTruthy();
    expect(fontFamilies.authorNote).toBeTruthy();

    expect(fontFamilies.story).toBe(fontFamilies.ending);
    expect(fontFamilies.story).toBe(fontFamilies.authorNote);
  });

  test('section titles use consistent styling', async ({ page }) => {
    // Both "One Last Thing" and "Author's Note" should use .section-title
    const sectionTitles = page.locator('.section-title');
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
    // Navigate to the first story page
    const total = parseInt(await page.locator('#totalPages').textContent());

    for (let i = 1; i <= total; i++) {
      await goToScreen(page, i);
      const isStory = await page.locator('.page.active .story-page').count();
      if (isStory > 0) {
        // First paragraph should have drop-cap class
        const firstP = page.locator('.page.active .story-page p').first();
        await expect(firstP).toHaveClass(/drop-cap/);
        break;
      }
    }
  });
});
