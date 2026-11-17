import path from "node:path";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

/**
 * The suite is 56 tests in 10 files. This is a floor, not a lockstep: adding tests
 * needs no edit, while a spec file that stops being collected (renamed, moved out
 * of `testDir`, excluded by `testMatch`/`testIgnore`) takes the total below it.
 * Raise it when a suite is added; never lower it to turn a red run green without
 * deciding that the lost tests are genuinely gone.
 */
const MIN_TESTS = 56;

/**
 * CI must not pass with a skipped spec.
 *
 * The database specs skip themselves when the throwaway Postgres cannot start
 * (`test.skip(!harness.ready, …)`), which used to leave a green run with the whole
 * integration half missing. `assertDockerForCi` covers the startup case; this
 * covers the rest — a daemon that dies mid-run, a harness regression, an
 * over-broad `test.skip` — inside the runner, so there is no report file that can
 * go missing or be left over from an earlier run.
 *
 * Attached only in CI (see playwright.config.ts): on a laptop without Docker the
 * database specs still skip, which is the point of the local skip.
 */
export default class SkipGuard implements Reporter {
  private readonly skipped: string[] = [];
  private collected = 0;

  onBegin(_config: FullConfig, suite: Suite): void {
    // Counted before anything runs: a spec that was never collected cannot skip,
    // so the skip list alone would let a missing file through.
    this.collected = suite.allTests().length;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== "skipped") return;
    const file = path.relative(process.cwd(), test.location.file) || test.location.file;
    const project = test.parent.project()?.name;
    this.skipped.push(
      `${file}:${test.location.line} ${test.title}${project ? ` [${project}]` : ""}`,
    );
  }

  onEnd(result: FullResult): void {
    const problems: string[] = [];

    // Only a full CI run has a known count; a filtered local run is a different
    // run, not evidence that a spec went missing.
    if (process.env.CI && this.collected < MIN_TESTS) {
      problems.push(
        `${this.collected} tests collected, expected at least ${MIN_TESTS} — did a spec ` +
          "file stop being collected (a rename, testDir, testMatch or testIgnore)?",
      );
    }

    if (this.skipped.length > 0) {
      console.error(`[e2e] ${this.skipped.length} test(s) skipped — CI must run every spec:`);
      for (const test of this.skipped) console.error(`  - ${test}`);
      problems.push(`${this.skipped.length} test(s) skipped`);
    }

    if (problems.length === 0) return;
    throw new Error(`${problems.join("; ")}; run exit was "${result.status}"`);
  }
}
