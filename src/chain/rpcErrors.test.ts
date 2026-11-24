import { describe, expect, it } from "vitest";
import {
  humanRpcError,
  isRetiredRpcUrl,
} from "./rpcErrors";

describe("isRetiredRpcUrl", () => {
  it("flags g4mm4", () => {
    expect(isRetiredRpcUrl("https://rpc-pulsechain.g4mm4.io")).toBe(true);
    expect(isRetiredRpcUrl("https://rpc-pulsechain.g4mm4.io/")).toBe(true);
  });

  it("leaves Official alone", () => {
    expect(isRetiredRpcUrl("https://rpc.pulsechain.com")).toBe(false);
  });
});

describe("humanRpcError", () => {
  it("rewrites Failed to fetch dumps", () => {
    const raw =
      'HTTP request failed. URL: https://rpc.pulsechain.com/ Request body: {"method":"eth_getBalance"} Details: Failed to fetch Version: viem@2';
    expect(humanRpcError(raw)).toMatch(/Can't reach/i);
    expect(humanRpcError(raw)).not.toMatch(/viem@|Request body/i);
  });

  it("names G4mm4 retirement", () => {
    expect(
      humanRpcError(
        "HTTP request failed. URL: https://rpc-pulsechain.g4mm4.io/ Details: Failed to fetch",
      ),
    ).toMatch(/G4mm4/i);
  });
});
