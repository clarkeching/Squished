// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Sequential to avoid port conflicts with static server
  reporter: 'list',
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'iPhone',
      use: {
        // Use Chromium with iPhone-sized viewport (not WebKit)
        // We're testing responsive layout, not browser engine differences
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  webServer: {
    command: 'npx serve . -l 3333 --no-clipboard',
    port: 3333,
    reuseExistingServer: !process.env.CI,
  },
});
