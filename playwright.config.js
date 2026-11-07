// E2E for the classroom demo (spec 001). Builds and serves the frontend and starts the in-memory API itself.
const { defineConfig, devices } = require('@playwright/test');

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 8080);
const API_PORT = 8787; // frontend/src/lib/class-session.ts points to :8787 on localhost

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1, // tests share one in-memory API server
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    acceptDownloads: true
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } }, testIgnore: /layout\.spec/ },
    { name: 'phone-360', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 800 } }, testMatch: /(layout|lesson-flow|lesson-dbp)\.spec/ }
  ],
  webServer: [
    {
      // Locally an already running `npm run dev:frontend` (same port) is reused.
      command: `npm run build && npm run preview -- --port ${FRONTEND_PORT}`,
      url: `http://localhost:${FRONTEND_PORT}/`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `node backend/dev-server.js ${API_PORT}`,
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI
    }
  ]
});
