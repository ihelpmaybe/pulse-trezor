import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AgentPolicyError,
  AI_KEY,
  assertCapability,
  bootAiPolicy,
  isCapabilityAllowed,
  publishAiBridge,
  registerAgentHandlers,
  saveAiPrefs,
  AI_DEFAULT,
} from "./hooks";

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
  });
}

describe("agent policy gate", () => {
  beforeEach(() => {
    mockLocalStorage();
    localStorage.clear();
    registerAgentHandlers({
      sign: null,
      prepare: null,
      simulate: null,
      explain: null,
    });
  });

  afterEach(() => {
    localStorage.clear();
    delete (globalThis as { __pulsePerchAi?: unknown }).__pulsePerchAi;
  });

  it("denies sign by default", () => {
    expect(isCapabilityAllowed("sign")).toBe(false);
    expect(() => assertCapability("sign")).toThrow(AgentPolicyError);
  });

  it("allows prepare by default", () => {
    expect(isCapabilityAllowed("prepare")).toBe(true);
    expect(() => assertCapability("prepare")).not.toThrow();
  });

  it("requestSign refuses when allowSign is off", async () => {
    const bridge = bootAiPolicy();
    await expect(
      bridge.requestSign({
        chainId: 369,
        to: "0x0000000000000000000000000000000000000001",
        value: 0n,
      }),
    ).rejects.toBeInstanceOf(AgentPolicyError);
  });

  it("requestSign runs handler when allowSign is on", async () => {
    saveAiPrefs({ ...AI_DEFAULT, allowSign: true });
    registerAgentHandlers({
      sign: async () => "0xabc" as `0x${string}`,
    });
    const bridge = publishAiBridge({ ...AI_DEFAULT, allowSign: true });
    const hash = await bridge.requestSign({
      chainId: 369,
      to: "0x0000000000000000000000000000000000000001",
      value: 1n,
    });
    expect(hash).toBe("0xabc");
    expect(localStorage.getItem(AI_KEY)).toBeTruthy();
  });
});
