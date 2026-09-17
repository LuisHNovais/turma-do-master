import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /prerender/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'mobile',
      testIgnore: /prerender/,
      use: { ...devices['Pixel 5'] },
    },
    // The pre-rendered /chat/<id> pages only exist in the built site.
    {
      name: 'prerender',
      testMatch: /prerender/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173' },
    },
  ],
  webServer: [
    {
      command: 'node node_modules/vite/bin/vite.js',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
    },
    {
      command: 'node node_modules/vite/bin/vite.js preview --port 4173',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
    },
  ],
});
