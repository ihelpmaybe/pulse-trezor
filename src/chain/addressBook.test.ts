import { describe, expect, it, beforeEach } from "vitest";
import {
  activityPoison,
  lookalikeAgainst,
  lookalikePoison,
  sendLookalikePoison,
  sendPoisonPeers,
  upsertAddressBook,
  type BookEntry,
} from "./addressBook";

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

describe("lookalikePoison", () => {
  beforeEach(() => store.clear());

  it("flags same head+tail different middle", () => {
    const known = "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8";
    upsertAddressBook(known, "me");
    const fake =
      known.slice(0, 6) +
      "deadbeefdeadbeefdeadbeefdeadbeef" +
      known.slice(-4);
    expect(fake).toHaveLength(42);
    expect(lookalikePoison(fake)?.label).toBe("me");
  });

  it("ignores exact match", () => {
    const known = "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8";
    const book: BookEntry[] = [
      { address: known as `0x${string}`, label: "me", addedAt: "" },
    ];
    expect(lookalikePoison(known, book)).toBeNull();
  });
});

describe("activityPoison", () => {
  const known = "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8";
  const fake =
    known.slice(0, 6) +
    "deadbeefdeadbeefdeadbeefdeadbeef" +
    known.slice(-4);
  const peers = [{ address: known, label: "prior out" }];

  it("flags dusty lookalike In", () => {
    const hit = activityPoison(
      { direction: "in", valueEth: "0.001", counterparty: fake },
      peers,
    );
    expect(hit?.dust).toBe(true);
    expect(hit?.label).toBe("prior out");
  });

  it("flags lookalike Out", () => {
    const hit = activityPoison(
      { direction: "out", valueEth: "1", counterparty: fake },
      peers,
    );
    expect(hit?.direction).toBe("out");
    expect(hit?.dust).toBe(false);
  });

  it("skips exact prior counterparty", () => {
    expect(
      activityPoison(
        { direction: "in", valueEth: "0.001", counterparty: known },
        peers,
      ),
    ).toBeNull();
  });

  it("lookalikeAgainst needs head+tail", () => {
    expect(lookalikeAgainst(fake, peers)?.known.toLowerCase()).toBe(
      known.toLowerCase(),
    );
  });
});

describe("sendLookalikePoison", () => {
  const known = "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8";
  const fake =
    known.slice(0, 6) +
    "deadbeefdeadbeefdeadbeefdeadbeef" +
    known.slice(-4);

  it("flags twin of prior Out even with empty book", () => {
    const hit = sendLookalikePoison(fake, [], [
      { direction: "out", counterparty: known },
    ]);
    expect(hit?.known.toLowerCase()).toBe(known.toLowerCase());
  });

  it("sendPoisonPeers dedupes book + outs", () => {
    const book: BookEntry[] = [
      { address: known as `0x${string}`, label: "me", addedAt: "" },
    ];
    const peers = sendPoisonPeers(book, [
      { direction: "out", counterparty: known },
      { direction: "in", counterparty: fake },
    ]);
    expect(peers.filter((p) => p.address.toLowerCase() === known.toLowerCase()))
      .toHaveLength(1);
    expect(peers.some((p) => p.address.toLowerCase() === fake.toLowerCase())).toBe(
      false,
    );
  });
});
