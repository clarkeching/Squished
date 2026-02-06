// Shared test helpers for Squished book viewer tests

/**
 * Navigate to the book viewer and wait for content to be fully loaded and paginated.
 * Clears localStorage to ensure a clean state.
 */
async function waitForBookReady(page) {
  // Navigate to the page
  await page.goto('/', { waitUntil: 'load' });

  // Clear localStorage for clean state
  await page.evaluate(() => localStorage.clear());

  // Reload to apply clean state (ensures we start from screen 1)
  await page.reload({ waitUntil: 'load' });

  // Wait for the contentLoaded custom event (fired by content-loader.js)
  // and for pagination to complete (script.js sets totalPages after calculating)
  await page.waitForFunction(() => {
    const totalEl = document.getElementById('totalPages');
    const book = document.querySelector('.book');
    const pages = book ? book.querySelectorAll('.page') : [];
    // Content is loaded when we have more than 1 page (the fallback title page)
    // and totalPages shows a number > 1
    return pages.length > 2 && totalEl && parseInt(totalEl.textContent) > 1;
  }, { timeout: 15000 });

  // Verify we're on screen 1
  await page.waitForFunction(() => {
    return document.getElementById('currentPage').textContent === '1';
  }, { timeout: 5000 });

  // Wait for layout settling and initial animation lock to clear
  await page.waitForTimeout(600);
}

/**
 * Wait for the page counter to show the expected value AND
 * for the animation lock to clear (400ms timeout in script.js).
 */
async function waitForScreenChange(page, expectedScreen) {
  // Wait for the counter text to update
  await page.waitForFunction(
    (expected) => {
      return document.getElementById('currentPage').textContent === String(expected);
    },
    expectedScreen,
    { timeout: 5000 }
  );
  // Wait for the isAnimating flag to clear (400ms in script.js + buffer)
  await page.waitForTimeout(500);
}

/**
 * Navigate to a specific screen number by clicking Next/Prev repeatedly.
 */
async function goToScreen(page, screenNum) {
  const current = await page.$eval('#currentPage', el => parseInt(el.textContent));
  if (screenNum === current) return;

  if (screenNum > current) {
    for (let i = current; i < screenNum; i++) {
      await page.click('#nextBtn');
      await waitForScreenChange(page, i + 1);
    }
  } else {
    for (let i = current; i > screenNum; i--) {
      await page.click('#prevBtn');
      await waitForScreenChange(page, i - 1);
    }
  }
}

/**
 * Navigate to the last screen.
 */
async function goToLastScreen(page) {
  const total = await page.$eval('#totalPages', el => parseInt(el.textContent));
  // Use keyboard End key for speed
  await page.keyboard.press('End');
  await waitForScreenChange(page, total);
}

/**
 * Find the screen number where a specific page type appears.
 * Returns the screen number (1-indexed) or -1 if not found.
 */
async function findScreenWithClass(page, className) {
  const total = await page.$eval('#totalPages', el => parseInt(el.textContent));

  for (let i = 1; i <= total; i++) {
    await goToScreen(page, i);
    const found = await page.$eval('.page.active .page-content', (el, cls) => {
      return el.classList.contains(cls);
    }, className).catch(() => false);

    if (found) return i;
  }
  return -1;
}

module.exports = { waitForBookReady, waitForScreenChange, goToScreen, goToLastScreen, findScreenWithClass };
