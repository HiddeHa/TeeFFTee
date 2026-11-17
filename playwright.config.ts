import { execFileSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: the app as a browser actually sees it.
 *
 * Two deliberate choices:
 *
 *  - The suite builds and serves the production output on its own port. `next
 *    dev` would be quicker to start, but it allows only one dev server per
 *    directory: any stray (or the one you are already running) makes the suite
 *    fail to boot, and its HMR socket requirement is one more thing that can
 *    leave the page unhydrated. `next start` has neither problem, and it is what
 *    ships.
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

/**
 * The database specs start their own Postgres containers, so CI must have Docker.
 *
 * Checked once here, before any spec or build runs, so a missing daemon aborts the
 * job with the reason `docker info` gave. A throw inside a spec's `beforeAll` would
 * instead be retried for every test in that file and report a cascade that says
 * nothing about the environment.
 */
function assertDockerForCi(): void {
  if (!process.env.CI) return;

  try {
    execFileSync("docker", ["info"], { stdio: "pipe", timeout: 15_000 });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
    throw new Error(
      "The database specs need Docker in CI, and `docker info` failed. " +
        "Without it these specs would silently skip.\n" +
        (stderr || (error instanceof Error ? error.message : String(error))),
    );
  }
}

assertDockerForCi();

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
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never" }],
        // A green CI run may not contain a skipped spec; see e2e/skip-guard.ts.
        ["./e2e/skip-guard.ts"],
      ]
    : [["list"]],
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
    command: `npm run build && npx next start --port ${PORT}`,
    url: baseURL,
    // Builds once, then reuses the running server on later runs.
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { DATABASE_URL: "" },
  },
});
