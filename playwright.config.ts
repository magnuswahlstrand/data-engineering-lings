import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1050 },
    baseURL: "http://127.0.0.1:5187",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 5187 --strictPort",
    url: "http://127.0.0.1:5187",
    reuseExistingServer: false,
  },
});
