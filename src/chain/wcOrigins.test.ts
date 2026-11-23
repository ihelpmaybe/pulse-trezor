import { describe, expect, it, beforeEach } from "vitest";
import {
  listOrigins,
  originAllowed,
  rememberOrigin,
} from "./wcOrigins";

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

describe("wcOrigins", () => {
  beforeEach(() => {
    store.clear();
  });

  it("remembers allow and deny", () => {
    expect(originAllowed("https://app.pulsex.com")).toBeNull();
    rememberOrigin("https://app.pulsex.com", true);
    expect(originAllowed("https://app.pulsex.com")).toBe(true);
    rememberOrigin("https://evil.example", false);
    expect(originAllowed("https://evil.example")).toBe(false);
    expect(listOrigins().length).toBe(2);
  });
});
