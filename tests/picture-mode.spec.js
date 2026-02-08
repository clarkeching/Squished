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

  test('caption text is visible and not clipped on picture pages', async ({ page }) => {
    // Switch to picture mode
    await page.locator(SELECTORS.modeToggle).click();
    await waitForAnimationIdle(page);

    // Navigate past title/quotes to a picture page (screen 3)
    const { goToScreen } = require('./helpers');
    await goToScreen(page, 3);

    // Check caption is visible and has non-zero dimensions
    const caption = page.locator(`${SELECTORS.activePage} ${SELECTORS.pictureCaption}`);
    await expect(caption).toBeVisible();

    const captionBox = await caption.boundingBox();
    expect(captionBox).not.toBeNull();
    expect(captionBox.height).toBeGreaterThan(10);

    // Caption should be within the page viewport (not clipped below)
    const pageBox = await page.locator(SELECTORS.activePage).boundingBox();
    const captionBottom = captionBox.y + captionBox.height;
    const pageBottom = pageBox.y + pageBox.height;
    expect(captionBottom).toBeLessThanOrEqual(pageBottom + 5); // 5px tolerance
  });

  test('image size is consistent across pages with different caption lengths', async ({ page }) => {
    // Switch to picture mode
    await page.locator(SELECTORS.modeToggle).click();
    await waitForAnimationIdle(page);

    const { goToScreen } = require('./helpers');
    const totalScreens = parseInt(await page.locator(SELECTORS.totalPages).textContent());

    // Sample several picture pages and collect image heights
    const imageHeights = [];
    const pagesToCheck = [3, 5, 10, 15, 20]; // spread across the book

    for (const screenNum of pagesToCheck) {
      if (screenNum > totalScreens) break;
      await goToScreen(page, screenNum);

      const img = page.locator(`${SELECTORS.activePage} ${SELECTORS.pictureImage}`);
      const isVisible = await img.isVisible().catch(() => false);
      if (!isVisible) continue;

      const imgBox = await img.boundingBox();
      if (imgBox && imgBox.height > 0) {
        imageHeights.push(imgBox.height);
      }
    }

    // We should have measured at least 3 images
    expect(imageHeights.length).toBeGreaterThanOrEqual(3);

    // All image heights should be within 5px of each other
    const maxH = Math.max(...imageHeights);
    const minH = Math.min(...imageHeights);
    expect(maxH - minH).toBeLessThanOrEqual(5);
  });

  test('sampled picture pages have a visible image and caption', async ({ page }) => {
    test.setTimeout(60000); // navigating ~100 clicks across 6 sample pages

    // Switch to picture mode
    await page.locator(SELECTORS.modeToggle).click();
    await waitForAnimationIdle(page);

    const { goToScreen } = require('./helpers');
    const totalScreens = parseInt(await page.locator(SELECTORS.totalPages).textContent());

    // Sample 6 picture pages spread across the book
    const firstPicture = 3;
    const lastPicture = totalScreens - 2;
    const step = Math.max(1, Math.floor((lastPicture - firstPicture) / 5));

    let checked = 0;
    for (let s = firstPicture; s <= lastPicture; s += step) {
      await goToScreen(page, s);

      const activePage = page.locator(SELECTORS.activePage);
      const isPicturePage = await activePage.locator('.picture-page').count() > 0;
      if (!isPicturePage) continue;

      const img = activePage.locator(SELECTORS.pictureImage);
      await expect(img).toBeVisible();

      const caption = activePage.locator(SELECTORS.pictureCaption);
      await expect(caption).toBeVisible();
      const text = await caption.textContent();
      expect(text.trim().length).toBeGreaterThan(0);

      checked++;
    }

    expect(checked).toBeGreaterThanOrEqual(5);
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
