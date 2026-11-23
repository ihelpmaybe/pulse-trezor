import { describe, expect, it } from "vitest";
import {
  buildSyncUriFromAccounts,
  compactWatchRegistry,
  decodeSyncPayload,
  encodeSyncUri,
} from "./syncPair";

const ADDR = "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8";

describe("syncPair SYNC2", () => {
  it("roundtrips scheme URI", () => {
    const uri = buildSyncUriFromAccounts({
      accounts: [{ address: ADDR, derivationIndex: 0 }],
      watch: null,
      chainId: 943,
      walletFingerprint: "trezor:lab",
    });
    expect(uri.startsWith("web+pulseperch://sync/v1/")).toBe(true);
    const dec = decodeSyncPayload(uri);
    expect(dec.ok).toBe(true);
    if (!dec.ok) return;
    expect(dec.import.accounts[0]?.address.toLowerCase()).toBe(ADDR.toLowerCase());
    expect(dec.import.chainId).toBe(943);
  });

  it("rejects seed in decoded JSON", () => {
    const evilJson = JSON.stringify({
      kind: "pulse-watch-registry",
      version: 1,
      schemeId: "pqq-metamask-bip44-v1",
      chainId: 369,
      walletFingerprint: "x",
      highestIndexSeen: 0,
      exportedAt: "2026-11-23T00:00:00.000Z",
      accounts: [{ address: ADDR, index: 0 }],
      mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    // Manual base64url (browser-less): use encode of clean then assert JSON path rejects
    const decJson = decodeSyncPayload(evilJson);
    expect(decJson.ok).toBe(false);
  });

  it("accepts ?sync= query wrapper", () => {
    const uri = buildSyncUriFromAccounts({
      accounts: [{ address: ADDR, derivationIndex: 1 }],
      chainId: 369,
      walletFingerprint: "watch",
    });
    const b64 = uri.replace("web+pulseperch://sync/v1/", "");
    const page = `http://127.0.0.1:5174/?sync=v1.${b64}`;
    const dec = decodeSyncPayload(page);
    expect(dec.ok).toBe(true);
    if (!dec.ok) return;
    expect(dec.import.accounts[0]?.derivationIndex).toBe(1);
  });

  it("caps accounts for QR compact", () => {
    const accounts = Array.from({ length: 20 }, (_, i) => ({
      address: ADDR,
      index: i,
    }));
    const c = compactWatchRegistry({
      kind: "pulse-watch-registry",
      accounts,
      chainId: 369,
    });
    expect((c.accounts as unknown[]).length).toBe(12);
  });
});
