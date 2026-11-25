/**
 * Opt-in light metrics — local first-send count only.
 * Never network, never seed, never addresses.
 */
export const METRICS_OPT_IN_KEY = "pulse-perch-metrics-opt-in-v1";
export const METRICS_COUNTS_KEY = "pulse-perch-metrics-counts-v1";

export type LightMetrics = {
  firstSendCount: number;
  lastSendAt: string | null;
};

const EMPTY: LightMetrics = { firstSendCount: 0, lastSendAt: null };

export function loadMetricsOptIn(): boolean {
  try {
    return localStorage.getItem(METRICS_OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMetricsOptIn(on: boolean) {
  try {
    if (on) localStorage.setItem(METRICS_OPT_IN_KEY, "1");
    else localStorage.removeItem(METRICS_OPT_IN_KEY);
  } catch {
    /* ignore */
  }
}

export function loadLightMetrics(): LightMetrics {
  try {
    const raw = localStorage.getItem(METRICS_COUNTS_KEY);
    if (!raw) return { ...EMPTY };
    const j = JSON.parse(raw) as Partial<LightMetrics>;
    return {
      firstSendCount: Math.max(0, Number(j.firstSendCount) || 0),
      lastSendAt: typeof j.lastSendAt === "string" ? j.lastSendAt : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Call after a successful broadcast. No-op unless opt-in. */
export function recordLocalSend(): LightMetrics {
  if (!loadMetricsOptIn()) return loadLightMetrics();
  const prev = loadLightMetrics();
  const next: LightMetrics = {
    firstSendCount: prev.firstSendCount + 1,
    lastSendAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(METRICS_COUNTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
