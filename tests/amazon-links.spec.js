const { test, expect } = require('@playwright/test');
const { waitForBookReady, goToLastScreen, goToScreen } = require('./helpers');

test.describe('Amazon Links', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBookReady(page);
  });

  test('Author\'s Note page contains Amazon links', async ({ page }) => {
    // The amazon-links div should exist somewhere in the DOM
    const amazonLinks = page.locator('.amazon-links');
    await expect(amazonLinks).toHaveCount(1);

    // It should contain at least one link to Amazon
    const links = amazonLinks.locator('a[href*="amazon"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Amazon links visible on last screen', async ({ page }) => {
    await goToLastScreen(page);

    // On the last screen, amazon-links should be visible (not hidden)
    const amazonLinks = page.locator('.amazon-links');
    // Check it doesn't have the hidden-overflow class
    await expect(amazonLinks).not.toHaveClass(/hidden-overflow/);
    await expect(amazonLinks).toBeVisible();
  });

  test('Amazon links have valid href attributes', async ({ page }) => {
    const amazonLinks = page.locator('.amazon-links a');
    const count = await amazonLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await amazonLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/^https?:\/\//);
      // Should open in new tab
      const target = await amazonLinks.nth(i).getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('Amazon link <p> tags are not counted by pagination', async ({ page }) => {
    // Navigate to the Author's Note page (last page with .author-note)
    // The pagination selector uses p:not(.amazon-links p)
    // so <p> tags inside .amazon-links should never get hidden-overflow
    await goToLastScreen(page);

    // Amazon links' internal <p> tags should not have hidden-overflow
    const amazonParagraphs = page.locator('.amazon-links p');
    const count = await amazonParagraphs.count();

    for (let i = 0; i < count; i++) {
      const hasHidden = await amazonParagraphs.nth(i).evaluate(
        el => el.classList.contains('hidden-overflow')
      );
      expect(hasHidden).toBe(false);
    }
  });
});
