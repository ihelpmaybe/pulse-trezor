import { describe, expect, it } from "vitest";
import {
  deadEndNativeSend,
  deadEndTokenTransfer,
} from "./deadEndRecipients";

const HEX = "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39";
const WPLS = "0xa1077a294dDE1B09bB078844df40758a5D0f9a27";
const WALLET = "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8";

describe("deadEndNativeSend", () => {
  it("blocks plain PLS to HEX", () => {
    const hit = deadEndNativeSend(HEX, "0x");
    expect(hit?.block).toBe(true);
    expect(hit?.name).toBe("HEX");
  });

  it("allows HEX stakeStart calldata", () => {
    expect(deadEndNativeSend(HEX, "0x52a438b8" + "00".repeat(64))).toBeNull();
  });

  it("blocks plain send to WPLS", () => {
    expect(deadEndNativeSend(WPLS, "0x")?.name).toBe("WPLS");
  });

  it("allows wallet recipients", () => {
    expect(deadEndNativeSend(WALLET, "0x")).toBeNull();
  });
});

describe("deadEndTokenTransfer", () => {
  it("blocks transfer to HEX contract", () => {
    const hit = deadEndTokenTransfer(HEX, HEX);
    expect(hit?.block).toBe(true);
  });

  it("blocks sending any token to HEX as recipient", () => {
    const hit = deadEndTokenTransfer(WPLS, HEX);
    expect(hit?.name).toBe("HEX");
  });

  it("allows transfer to a wallet", () => {
    expect(deadEndTokenTransfer(HEX, WALLET)).toBeNull();
  });
});
