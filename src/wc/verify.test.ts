import { describe, expect, it } from "vitest";
import { getVerifyState, verifyFace } from "./verify";

describe("getVerifyState", () => {
  it("maps VALID / INVALID / UNKNOWN / isScam", () => {
    expect(
      getVerifyState({ verified: { validation: "VALID" } }),
    ).toBe("DOMAIN_MATCH");
    expect(
      getVerifyState({ verified: { validation: "INVALID" } }),
    ).toBe("MISMATCH");
    expect(
      getVerifyState({ verified: { validation: "UNKNOWN" } }),
    ).toBe("UNVERIFIED");
    expect(
      getVerifyState({ verified: { validation: "VALID", isScam: true } }),
    ).toBe("THREAT");
    expect(getVerifyState(null)).toBe("UNVERIFIED");
  });
});

describe("verifyFace", () => {
  it("requires ack for mismatch and threat", () => {
    expect(verifyFace("MISMATCH").needsAck).toBe(true);
    expect(verifyFace("THREAT").needsAck).toBe(true);
    expect(verifyFace("DOMAIN_MATCH").needsAck).toBe(false);
    expect(verifyFace("UNVERIFIED").tone).toBe("warn");
  });
});
