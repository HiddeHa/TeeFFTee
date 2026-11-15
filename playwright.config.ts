import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: the app as a browser actually sees it.
 *
 * Two deliberate choices:
 *
 *  - The suite runs `next dev` on its own port instead of the built Worker, so
 *    `npm run test:e2e` needs no prior build, never fights a dev server you left
 *    running, and fails on application bugs rather than on stale output. The
 *    production build stays a separate gate (`npm run build`).
 *
 *  - `DATABASE_URL` is blanked for that server, so every assertion reads the
 *    committed catalogue snapshot and the curated content files. A suite that
 *    depended on live Postgres would pass or fail depending on when the crawler
 *    last ran, which is exactly the kind of test that gets ignored.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
// `localhost`, not `127.0.0.1`: Next's dev server only accepts the HMR socket from
// the origins it recognises, and a rejected socket leaves the page server-rendered
// forever — every click a no-op, every test a confusing timeout.
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // The pages are few and the dev server compiles per route; one worker keeps a
  // cold start from turning into a pile of timeouts.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /\.mobile\.spec\.ts$/,
      // The pinned board is a `lg` layout, so the layout tests need a desktop
      // viewport rather than Playwright's 1280x720 default.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      testMatch: /\.mobile\.spec\.ts$/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { DATABASE_URL: "" },
  },
});
