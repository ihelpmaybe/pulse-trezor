import { describe, expect, it } from "vitest";
import {
  buildWatchRegistryExport,
  looksLikeSeedPayload,
  parseWatchImportJson,
} from "./watchImport";

describe("watchImport SYNC1", () => {
  it("rejects mnemonic-ish blobs", () => {
    const words = Array.from({ length: 12 }, () => "abandon").join(" ");
    expect(looksLikeSeedPayload(words)).toBe(true);
    expect(parseWatchImportJson(words).ok).toBe(false);
  });

  it("rejects seed-like JSON keys nested", () => {
    const r = parseWatchImportJson(
      JSON.stringify({
        kind: "pulse-watch-registry",
        accounts: [{ address: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8" }],
        meta: { mnemonic: "nope" },
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/seed|mnemonic/i);
  });

  it("rejects xprv-looking values", () => {
    const r = parseWatchImportJson(
      JSON.stringify({
        kind: "pulse-watch-registry",
        notes: "xprv secretly here",
        accounts: [
          { address: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8", index: 0 },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("accepts SYNC1 kind", () => {
    const r = parseWatchImportJson(
      JSON.stringify({
        kind: "pulse-watch-registry",
        version: 1,
        schemeId: "pqq-metamask-bip44-v1",
        chainId: 369,
        walletFingerprint: "trezor:lab",
        highestIndexSeen: 0,
        exportedAt: "2026-11-23T00:00:00.000Z",
        accounts: [
          {
            address: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
            index: 0,
            derivationPath: "m/44'/60'/0'/0/0",
          },
        ],
        addressBook: [],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0].derivationIndex).toBe(0);
    expect(r.accounts[0].derivationPath).toBe("m/44'/60'/0'/0/0");
    expect(r.schemeId).toBe("pqq-metamask-bip44-v1");
  });

  it("accepts legacy pulse-perch-watch", () => {
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

  it("buildWatchRegistryExport matches SYNC1 kind", () => {
    const doc = buildWatchRegistryExport({
      accounts: [
        {
          address: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
          derivationIndex: 0,
          derivationPath: "m/44'/60'/0'/0/0",
        },
      ],
      watch: null,
      addressBook: [],
      chainId: 943,
      walletFingerprint: "trezor:lab",
    });
    expect(doc.kind).toBe("pulse-watch-registry");
    expect(doc.version).toBe(1);
    expect(doc.chainId).toBe(943);
    expect(doc.schemeId).toBe("pqq-metamask-bip44-v1");
    const round = parseWatchImportJson(JSON.stringify(doc));
    expect(round.ok).toBe(true);
    expect(round.accounts[0]?.address.toLowerCase()).toBe(
      "0x73d0385f4d8e00c5e6504c6030f47bf6212736a8",
    );
  });
});
