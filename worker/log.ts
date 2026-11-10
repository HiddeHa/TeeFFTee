/** Tiny timestamped logger. One line per event, greppable, no dependencies. */

type Level = "info" | "warn" | "error";

function emit(level: Level, scope: string, message: string, extra?: unknown): void {
  const time = new Date().toISOString().slice(11, 19);
  const line = `${time} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}`;
  if (extra === undefined) {
    console.log(line);
  } else {
    console.log(`${line} ${JSON.stringify(extra)}`);
  }
}

export function createLogger(scope: string) {
  return {
    info: (message: string, extra?: unknown) => emit("info", scope, message, extra),
    warn: (message: string, extra?: unknown) => emit("warn", scope, message, extra),
    error: (message: string, extra?: unknown) => emit("error", scope, message, extra),
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep that wakes early if the process is asked to stop, so a 5-minute cycle
 * gap does not turn into a 5-minute shutdown delay.
 */
export function sleepUnless(ms: number, shouldStop: () => boolean): Promise<void> {
  const deadline = Date.now() + ms;
  return new Promise((resolve) => {
    const tick = () => {
      if (shouldStop() || Date.now() >= deadline) {
        resolve();
        return;
      }
      setTimeout(tick, Math.min(500, Math.max(50, deadline - Date.now())));
    };
    tick();
  });
}
