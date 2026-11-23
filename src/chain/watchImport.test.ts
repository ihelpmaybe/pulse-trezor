import { describe, expect, it } from "vitest";
import { looksLikeSeedPayload, parseWatchImportJson } from "./watchImport";

describe("watchImport", () => {
  it("rejects mnemonic-ish blobs", () => {
    const words = Array.from({ length: 12 }, () => "abandon").join(" ");
    expect(looksLikeSeedPayload(words)).toBe(true);
    expect(parseWatchImportJson(words).ok).toBe(false);
  });

  it("rejects seed-like JSON keys", () => {
    const r = parseWatchImportJson(
      JSON.stringify({ mnemonic: "nope", accounts: [] }),
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/seed/i);
  });

  it("accepts watch export shape", () => {
    const r = parseWatchImportJson(
      JSON.stringify({
        kind: "pulse-perch-watch",
        accounts: [
          {
            address: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
            derivationIndex: 0,
          },
        ],
        addressBook: [],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.accounts).toHaveLength(1);
  });
});
