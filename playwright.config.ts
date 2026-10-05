import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 180000,
  use: {
    baseURL: 'http://127.0.0.1:5174', channel: 'chrome', viewport: { width: 1440, height: 1050 },
    launchOptions: { args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] },
  },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:5174', reuseExistingServer: true },
  reporter: 'list',
  outputDir: 'artifacts/browser-tests',
});
