// Shared test helpers for Squished book viewer tests
const { SELECTORS, TIMEOUTS } = require('./constants');

/**
 * Navigate to the book viewer and wait for content to be fully loaded and paginated.
 * Clears localStorage to ensure a clean state.
 */
async function waitForBookReady(page) {
  // Clear localStorage before navigation (runs before every page load)
  await page.addInitScript(() => localStorage.clear());

  // Single page load (no reload needed — addInitScript handles clean state)
  await page.goto('/', { waitUntil: 'load' });

  // Wait for content to be loaded and paginated
  await page.waitForFunction(() => {
    const totalEl = document.getElementById('totalPages');
    const book = document.querySelector('.book');
    const pages = book ? book.querySelectorAll('.page') : [];
    return pages.length > 2 && totalEl && parseInt(totalEl.textContent) > 1;
  }, { timeout: TIMEOUTS.contentLoad });

  // Verify we're on screen 1
  await page.waitForFunction(() => {
    return document.getElementById('currentPage').textContent === '1';
  }, { timeout: TIMEOUTS.screenChange });

  // Wait for animation lock to be clear
  await waitForAnimationIdle(page);
}

/**
 * Poll for the animation lock to clear instead of using a fixed sleep.
 * Falls back after timeout — window.__squished_animating is set by script.js.
 */
async function waitForAnimationIdle(page) {
  await page.waitForFunction(() => {
    return !window.__squished_animating;
  }, { timeout: TIMEOUTS.animationIdle }).catch(() => {
    // If flag was never set (e.g. no navigation happened), that's fine
  });
}

/**
 * Wait for the page counter to show the expected value AND
 * for the animation lock to clear.
 */
async function waitForScreenChange(page, expectedScreen) {
  await page.waitForFunction(
    (expected) => {
      return document.getElementById('currentPage').textContent === String(expected);
    },
    expectedScreen,
    { timeout: TIMEOUTS.screenChange }
  );
  await waitForAnimationIdle(page);
}

/**
 * Navigate to a specific screen number by clicking Next/Prev repeatedly.
 */
async function goToScreen(page, screenNum) {
  const current = await page.$eval(SELECTORS.currentPage, el => parseInt(el.textContent));
  if (screenNum === current) return;

  if (screenNum > current) {
    for (let i = current; i < screenNum; i++) {
      await page.click(SELECTORS.nextBtn);
      await waitForScreenChange(page, i + 1);
    }
  } else {
    for (let i = current; i > screenNum; i--) {
      await page.click(SELECTORS.prevBtn);
      await waitForScreenChange(page, i - 1);
    }
  }
}

/**
 * Navigate to the last screen.
 */
async function goToLastScreen(page) {
  const total = await page.$eval(SELECTORS.totalPages, el => parseInt(el.textContent));
  await page.keyboard.press('End');
  await waitForScreenChange(page, total);
}

module.exports = { waitForBookReady, waitForAnimationIdle, waitForScreenChange, goToScreen, goToLastScreen };
