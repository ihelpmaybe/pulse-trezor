import { afterEach, describe, expect, it, vi } from "vitest";

describe("isShowcase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("is true when VITE_SHOWCASE=1", async () => {
    vi.stubEnv("VITE_SHOWCASE", "1");
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    const { isShowcase } = await import("./showcase");
    expect(isShowcase()).toBe(true);
  });

  it("forces true on github.io even without env", async () => {
    vi.stubEnv("VITE_SHOWCASE", "");
    vi.stubGlobal("window", {
      location: { hostname: "ihelpmaybe.github.io" },
    });
    const { isShowcase } = await import("./showcase");
    expect(isShowcase()).toBe(true);
  });

  it("is false on localhost without env", async () => {
    vi.stubEnv("VITE_SHOWCASE", "");
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });
    const { isShowcase } = await import("./showcase");
    expect(isShowcase()).toBe(false);
  });
});
