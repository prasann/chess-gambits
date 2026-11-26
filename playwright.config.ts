import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 15000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  use: {
    baseURL: 'http://127.0.0.1:4173/chess-gambits/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'pixel', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173/chess-gambits/', reuseExistingServer: !process.env.CI },
    { command: 'npx vite --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174/chess-gambits/tests/board.html', reuseExistingServer: !process.env.CI },
  ],
})
