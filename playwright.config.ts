import { defineConfig, devices } from "@playwright/test";

// End-to-end tests in e2e/ drive the real app in Chromium against the local
// Supabase stack (`npm run db:start` first). Locally they reuse a running
// `npm run dev` (Next allows one dev server per project) or start one; CI
// runs them against the production build.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
