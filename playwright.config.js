// Dev-only test config. The site itself needs none of this.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 240000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080/',
    trace: 'off'
  },
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: true,
    timeout: 20000
  },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-375', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }
  ]
});
