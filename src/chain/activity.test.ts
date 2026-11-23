import { describe, expect, it } from "vitest";
import { mapScanTx } from "./activity";

const owner = "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8";

describe("mapScanTx", () => {
  it("maps self transfer", () => {
    const row = mapScanTx(
      {
        hash: "0x8bd91180123fdb2d8d5d6d5c7f44810d1fe944aab7c17e97f7bb7a1b6ac22c6e",
        timestamp: "2026-11-22T22:17:39.000000Z",
        status: "ok",
        result: "success",
        value: "1000000000000000",
        from: { hash: owner },
        to: { hash: owner },
        method: null,
      },
      owner,
    );
    expect(row?.direction).toBe("self");
    expect(row?.status).toBe("ok");
    expect(row?.valueEth).toBe("0.001");
  });

  it("maps outbound", () => {
    const row = mapScanTx(
      {
        hash: "0x" + "ab".repeat(32),
        status: "ok",
        value: "0",
        from: { hash: owner },
        to: { hash: "0x1111111111111111111111111111111111111111" },
      },
      owner,
    );
    expect(row?.direction).toBe("out");
    expect(row?.counterparty).toBe(
      "0x1111111111111111111111111111111111111111",
    );
  });
});
