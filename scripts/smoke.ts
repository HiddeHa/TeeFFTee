/**
 * Post-deploy smoke check.
 *
 * CI proves the source compiles and the content resolves; it says nothing about the
 * deployment Vercel actually promoted. Two failures have happened here without a
 * single red test: the running Worker losing Postgres (every page quietly falls
 * back to the curated snapshot) and a production build serving without the
 * measured pages. Both are visible from the outside, so this checks the live
 * origin instead of trusting the build:
 *
 *   - GET /api/health must answer 200 with `status: "ok"` — reachable database and
 *     a classified sample. The endpoint itself returns 503 for "down" and "empty",
 *     and its body says which (bad password code, node count, crawl age).
 *   - GET / must answer 200 with the homepage hero and the current set and patch,
 *     so a deploy cannot serve a placeholder or a framework error page.
 *
 *   npm run smoke -- https://teefftee.example
 *   SMOKE_URL=https://teefftee.example npm run smoke
 *
 * A deploy is promoted before every edge is warm, so a transient failure is
 * retried; a real one still exits non-zero after the last attempt.
 */
import { site } from "../src/content/site";

const ATTEMPTS = 3;
const RETRY_MS = 3_000;
const TIMEOUT_MS = 15_000;

type HealthPayload = {
  status?: string;
  checkedAt?: string;
  database?: {
    configured?: boolean;
    reachable?: boolean;
    driver?: string;
    error?: { message?: string; code?: string } | null;
  };
  corpus?: {
    matches?: number;
    boards?: number;
    classifiedGames?: number;
    latestPatch?: string | null;
    lastCrawlAt?: string | null;
    crawlAgeMinutes?: number | null;
    matchesInWindow?: number;
    windowHours?: number;
  } | null;
};

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(url: string): Promise<Response> {
  return fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "teefftee-smoke" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function checkHealth(base: string): Promise<string> {
  const response = await request(`${base}/api/health`);
  const body = await response.text();

  let payload: HealthPayload;
  try {
    payload = JSON.parse(body) as HealthPayload;
  } catch {
    throw new Error(
      `/api/health returned ${response.status} with a non-JSON body: ${body.slice(0, 120)}`,
    );
  }

  if (response.status !== 200) {
    // The endpoint distinguishes "down" from "empty" itself, so repeat its reason
    // rather than a generic "smoke failed".
    const reason =
      payload.status === "down"
        ? payload.database?.error?.message ?? "database unreachable"
        : payload.status === "empty"
          ? `no classified games (${payload.corpus?.matches ?? 0} matches, ${payload.corpus?.classifiedGames ?? 0} classified)`
          : JSON.stringify(payload).slice(0, 160);
    throw new Error(`/api/health returned ${response.status}: ${reason}`);
  }

  requireThat(payload.status === "ok", `/api/health reported status "${payload.status}" with HTTP 200`);
  requireThat(payload.database?.reachable === true, "/api/health reported ok without a reachable database");

  const corpus = payload.corpus;
  requireThat(corpus, "/api/health reported ok without a corpus");
  requireThat((corpus.matches ?? 0) > 0, `/api/health corpus holds ${corpus.matches ?? 0} matches`);
  requireThat(
    (corpus.classifiedGames ?? 0) > 0,
    `/api/health corpus holds ${corpus.classifiedGames ?? 0} classified games — every comp renders "collecting data"`,
  );
  requireThat(
    corpus.windowHours === 72,
    `/api/health reports a ${corpus.windowHours}-hour crawl window, expected 72`,
  );
  requireThat(corpus.latestPatch, "/api/health reports no latestPatch");

  const crawl =
    corpus.crawlAgeMinutes === null || corpus.crawlAgeMinutes === undefined
      ? "never crawled"
      : `last crawl ${corpus.crawlAgeMinutes}m ago`;
  return `health ok — ${corpus.matches} matches, patch ${corpus.latestPatch}, ${crawl}`;
}

async function checkHome(base: string): Promise<string> {
  const startedAt = performance.now();
  const response = await request(`${base}/`);
  const html = await response.text();
  const elapsed = Math.round(performance.now() - startedAt);

  requireThat(response.status === 200, `GET / returned ${response.status}: ${html.slice(0, 120)}`);
  requireThat(
    (response.headers.get("content-type") ?? "").includes("text/html"),
    `GET / served ${response.headers.get("content-type") ?? "no content type"}`,
  );

  // React separates adjacent text nodes in SSR output with `<!-- -->`, so
  // `Set {18}` arrives as `Set <!-- -->18`; strip comments before matching.
  const text = html.replace(/<!--[\s\S]*?-->/g, "");

  // Markers that only the real homepage renders. The set and patch come from
  // content, so the smoke check follows a set switch instead of pinning 18.6.
  const markers = [
    "High-elo TFT stats, read by someone who plays there.",
    `Set ${site.setNumber}`,
    `patch ${site.currentPatch}`,
  ];
  const missing = markers.filter((marker) => !text.includes(marker));
  requireThat(
    missing.length === 0,
    `GET / is missing ${missing.map((marker) => JSON.stringify(marker)).join(", ")} — ` +
      "did the deploy serve a placeholder or an error page?",
  );

  return `home ok — 200 in ${elapsed}ms`;
}

async function main(): Promise<void> {
  const base = (process.argv[2] ?? process.env.SMOKE_URL)?.trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("no URL: pass one (`npm run smoke -- https://…`) or set SMOKE_URL");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      // Sequential on purpose: when both are broken, the health failure is the
      // useful one to report first, not whichever promise rejected earliest.
      const health = await checkHealth(base);
      const home = await checkHome(base);
      console.log(`[smoke] ${base}`);
      console.log(`[smoke]   ${health}`);
      console.log(`[smoke]   ${home}`);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < ATTEMPTS) {
        console.error(`[smoke] attempt ${attempt}/${ATTEMPTS} failed: ${message}`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      }
    }
  }

  throw lastError;
}

main().catch((error: unknown) => {
  console.error(`[smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
