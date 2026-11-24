import { describe, expect, it } from "vitest";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { clearSignMessage, hasHardDeadEnd } from "./clearSign";
import {
  assertSiweAllowed,
  checkSiweGate,
  originAuthority,
} from "./siweGate";

const addr = "0x00000000000000000000000000000000000000a1" as const;

function loginMsg(domain: string, uri = `https://${domain}`) {
  return createSiweMessage({
    address: addr,
    chainId: 369,
    domain,
    nonce: generateSiweNonce(),
    uri,
    version: "1",
    statement: "Sign in to the desk lab",
  });
}

describe("siweGate", () => {
  it("extracts host from URL", () => {
    expect(originAuthority("https://app.pulsex.com/swap")).toBe(
      "app.pulsex.com",
    );
    expect(originAuthority("app.pulsex.com")).toBe("app.pulsex.com");
  });

  it("allows matching domain", () => {
    const message = loginMsg("app.pulsex.com");
    const g = checkSiweGate({
      message,
      dappUrl: "https://app.pulsex.com",
      address: addr,
      chainId: 369,
    });
    expect(g.status).toBe("ok");
  });

  it("blocks domain ≠ origin (phishing)", () => {
    const message = loginMsg("evil.example");
    const g = checkSiweGate({
      message,
      dappUrl: "https://app.pulsex.com",
      address: addr,
      chainId: 369,
    });
    expect(g.status).toBe("blocked");
    if (g.status === "blocked") {
      expect(g.messageDomain).toBe("evil.example");
      expect(g.originHost).toBe("app.pulsex.com");
    }
    expect(() =>
      assertSiweAllowed({
        message,
        dappUrl: "https://app.pulsex.com",
        address: addr,
      }),
    ).toThrow(/does not match/i);
  });

  it("blocks SIWE with no origin", () => {
    const message = loginMsg("app.pulsex.com");
    const g = checkSiweGate({ message, dappUrl: null, address: addr });
    expect(g.status).toBe("blocked");
  });

  it("ignores plain personal_sign text", () => {
    expect(
      checkSiweGate({
        message: "hello world",
        dappUrl: "https://app.pulsex.com",
      }).status,
    ).toBe("not-siwe");
  });

  it("clear-sign hard-blocks mismatched SIWE", () => {
    const message = loginMsg("phish.tld");
    const lines = clearSignMessage({
      method: "personal_sign",
      dappUrl: "https://app.pulsex.com",
      preview: message,
      address: addr,
      chainId: 369,
    });
    expect(lines.some((l) => l.title === "SIWE · blocked")).toBe(true);
    expect(hasHardDeadEnd(lines)).toBe(true);
  });

  it("clear-sign marks matching SIWE ok", () => {
    const message = loginMsg("app.pulsex.com");
    const lines = clearSignMessage({
      method: "personal_sign",
      dappUrl: "https://app.pulsex.com",
      preview: message,
      address: addr,
      chainId: 369,
    });
    expect(lines.some((l) => l.title === "SIWE login")).toBe(true);
    expect(hasHardDeadEnd(lines)).toBe(false);
  });
});
