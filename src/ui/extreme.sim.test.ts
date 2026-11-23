/**
 * Extreme wallets / values / poison / clear-sign — no live chain.
 */
import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import {
  activityPoison,
  lookalikeAgainst,
  lookalikePoison,
} from "../chain/addressBook";
import { mapScanTx } from "../chain/activity";
import {
  clearSignMessage,
  clearSignTx,
  needsBlindConfirm,
  needsDangerAck,
  phishingWarn,
} from "../wc/clearSign";
import {
  ACCOUNT_COUNT_MAX,
  ACCOUNT_COUNT_MIN,
  clampAccountCount,
  fmtActivityAmtParts,
  shortAddr,
  shortNative,
} from "./faceFormat";

const WHALE = "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8";
const poisonTwin = (a: string, mid = "deadbeefdeadbeefdeadbeefdeadbeef") =>
  a.slice(0, 6) + mid + a.slice(-4);

describe("extreme · face amounts", () => {
  it("formats dust → whale → overflow-ish wei", () => {
    expect(shortNative(0n)).toBe("0");
    expect(shortNative(1n)).toMatch(/e-|\d/i);
    expect(shortNative(parseEther("0.000000123"))).toBeTruthy();
    expect(shortNative(parseEther("8.129687499999559"))).toBeTruthy();
    expect(shortNative(parseEther("999999999"))).toMatch(/999/);
    // Max uint-ish for display — must not throw
    const fat = 10n ** 30n;
    expect(() => shortNative(fat)).not.toThrow();
    expect(shortNative(fat).length).toBeGreaterThan(0);
  });

  it("activity amt parts survive crazy strings", () => {
    expect(fmtActivityAmtParts("0")).toBeNull();
    expect(fmtActivityAmtParts("")).toBeNull();
    expect(fmtActivityAmtParts("NaN")).toBeNull();
    expect(fmtActivityAmtParts("Infinity")).toBeNull();
    expect(fmtActivityAmtParts("-1")?.int).toBeTruthy();
    expect(fmtActivityAmtParts("0.000000000000000001")).toBeTruthy();
    expect(fmtActivityAmtParts("1000000000000")?.int).toBeTruthy();
    expect(fmtActivityAmtParts("1e-18")).toBeTruthy();
    expect(fmtActivityAmtParts("1e21")?.int).toBeTruthy();
  });

  it("account count clamp under abuse", () => {
    expect(clampAccountCount(NaN)).toBe(ACCOUNT_COUNT_MIN);
    expect(clampAccountCount(-1e9)).toBe(ACCOUNT_COUNT_MIN);
    expect(clampAccountCount(0)).toBe(ACCOUNT_COUNT_MIN);
    expect(clampAccountCount(12.9)).toBe(12);
    expect(clampAccountCount(ACCOUNT_COUNT_MAX + 999)).toBe(ACCOUNT_COUNT_MAX);
    expect(clampAccountCount(Number.POSITIVE_INFINITY)).toBe(
      ACCOUNT_COUNT_MIN,
    );
  });

  it("shortAddr on truncated / empty", () => {
    expect(shortAddr("")).toBe("");
    expect(shortAddr("0xab")).toBe("0xab");
    expect(shortAddr(WHALE)).toMatch(/^0x73d0…/);
  });
});

describe("extreme · poison wallets", () => {
  const peers = [
    { address: WHALE, label: "treasury" },
    {
      address: "0x1111111111111111111111111111111111111111",
      label: "burn-ish",
    },
  ];

  it("flags lookalike dust In from twin of prior Out", () => {
    const fake = poisonTwin(WHALE);
    expect(fake).toHaveLength(42);
    const hit = activityPoison(
      { direction: "in", valueEth: "1e-18", counterparty: fake },
      peers,
    );
    expect(hit?.dust).toBe(true);
    expect(hit?.label).toBe("treasury");
  });

  it("flags huge lookalike In (not only dust)", () => {
    const hit = activityPoison(
      {
        direction: "in",
        valueEth: "999999",
        counterparty: poisonTwin(WHALE, "cafebabecafebabecafebabecafebabe"),
      },
      peers,
    );
    expect(hit).not.toBeNull();
    expect(hit?.dust).toBe(false);
  });

  it("ignores garbage counterparties", () => {
    for (const bad of [
      null,
      "",
      "0x",
      "not-an-address",
      "0x" + "gg".repeat(20),
      WHALE.slice(0, 20),
    ]) {
      expect(
        activityPoison(
          { direction: "in", valueEth: "0.001", counterparty: bad },
          peers,
        ),
      ).toBeNull();
    }
  });

  it("self / other never poison", () => {
    expect(
      activityPoison(
        {
          direction: "self",
          valueEth: "0.001",
          counterparty: poisonTwin(WHALE),
        },
        peers,
      ),
    ).toBeNull();
  });

  it("chaos peers list does not throw", () => {
    const chaos = Array.from({ length: 500 }, (_, i) => ({
      address: (`0x${i.toString(16).padStart(40, "0")}`) as string,
      label: `w${i}`,
    }));
    chaos.push({ address: WHALE, label: "real" });
    const fake = poisonTwin(WHALE);
    expect(() => lookalikeAgainst(fake, chaos)).not.toThrow();
    expect(lookalikePoison(fake, [])).toBeNull();
  });
});

describe("extreme · scan / activity map", () => {
  it("survives missing fields and giant value", () => {
    expect(mapScanTx({}, WHALE)).toBeNull();
    expect(mapScanTx({ hash: "nope" }, WHALE)).toBeNull();
    const giant = mapScanTx(
      {
        hash: "0x" + "ff".repeat(32),
        value: (10n ** 36n).toString(),
        from: { hash: "0x2222222222222222222222222222222222222222" },
        to: { hash: WHALE },
        status: "ok",
      },
      WHALE,
    );
    expect(giant?.direction).toBe("in");
    expect(Number(giant?.valueEth)).toBeGreaterThan(0);
  });

  it("contract create (null to) stays other/out-safe", () => {
    const row = mapScanTx(
      {
        hash: "0x" + "11".repeat(32),
        value: "0",
        from: { hash: WHALE },
        to: null,
        status: "ok",
        method: "0x60c06040",
      },
      WHALE,
    );
    expect(row?.direction).toBe("out");
    expect(row?.counterparty).toBeNull();
  });
});

describe("extreme · clear-sign / phishing", () => {
  it("empty origin + blind + permit stack danger", () => {
    const lines = clearSignTx({
      to: "0x0000000000000000000000000000000000000000",
      data: "0xdeadbeef" + "ff".repeat(128),
      value: parseEther("1000000").toString(),
      dappUrl: "",
      method: "eth_sendTransaction",
    });
    expect(needsBlindConfirm(lines)).toBe(true);

    const msg = clearSignMessage({
      method: "eth_sign",
      dappUrl: "https://claim-hex-airdrop.evil",
      preview: "0x" + "00".repeat(64),
    });
    expect(needsDangerAck(msg)).toBe(true);
    expect(phishingWarn("https://trezor-suite-login.tk")?.tone).toBe("danger");
    expect(phishingWarn("https://support-trezor.evil")?.tone).toBe("danger");
  });

  it("unicode / homoglyph-ish host still evaluated", () => {
    expect(() => phishingWarn("https://рulsex.com")).not.toThrow();
    expect(() => phishingWarn("javascript:alert(1)")).not.toThrow();
  });
});
