import { beforeEach, describe, expect, it } from "vitest";
import {
  getCustomEvmPack,
  isEvmChainId,
  listCustomEvmPacks,
  removeCustomEvmPack,
  upsertCustomEvmPack,
} from "./evmNetworks";
import { hasChainPack, isNativeAsset, packFor } from "./client";

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

describe("evmNetworks", () => {
  beforeEach(() => store.clear());

  it("isEvmChainId bounds", () => {
    expect(isEvmChainId(8453)).toBe(true);
    expect(isEvmChainId(0)).toBe(false);
    expect(isEvmChainId(-1)).toBe(false);
    expect(isEvmChainId(1.5)).toBe(false);
  });

  it("upsert + packFor custom Base-like", () => {
    upsertCustomEvmPack({
      name: "Base",
      chainId: 8453,
      currency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpc: ["https://mainnet.base.org"],
      source: "custom",
    });
    expect(getCustomEvmPack(8453)?.name).toBe("Base");
    expect(hasChainPack(8453)).toBe(true);
    expect(packFor(8453).rpc[0]).toBe("https://mainnet.base.org");
    expect(isNativeAsset("ETH", 8453)).toBe(true);
    expect(isNativeAsset("PLS", 8453)).toBe(false);
    expect(isNativeAsset("PLS", 369)).toBe(true);
    removeCustomEvmPack(8453);
    expect(listCustomEvmPacks()).toHaveLength(0);
  });
});
