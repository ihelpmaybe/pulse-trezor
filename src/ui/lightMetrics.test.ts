import { beforeEach, describe, expect, it } from "vitest";
import {
  loadLightMetrics,
  loadMetricsOptIn,
  METRICS_COUNTS_KEY,
  METRICS_OPT_IN_KEY,
  recordLocalSend,
  saveMetricsOptIn,
} from "./lightMetrics";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  },
  configurable: true,
});

describe("lightMetrics", () => {
  beforeEach(() => {
    store.clear();
    store.delete(METRICS_OPT_IN_KEY);
    store.delete(METRICS_COUNTS_KEY);
  });

  it("source promises local-only (no fetch)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.join(__dirname, "lightMetrics.ts"),
      "utf8",
    );
    expect(src).toMatch(/Never network/i);
    expect(src).not.toMatch(/\bfetch\s*\(/);
  });

  it("does not count when opt-in is off", () => {
    expect(loadMetricsOptIn()).toBe(false);
    expect(recordLocalSend().firstSendCount).toBe(0);
  });

  it("counts locally when opted in", () => {
    saveMetricsOptIn(true);
    expect(recordLocalSend().firstSendCount).toBe(1);
    expect(recordLocalSend().firstSendCount).toBe(2);
    expect(loadLightMetrics().lastSendAt).toBeTruthy();
  });
});
