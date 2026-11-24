/**
 * SIWE (EIP-4361) gate — message domain must match the requesting origin.
 * Wraps viem parseSiweMessage / validateSiweMessage (no new SIWE package).
 */
import { isAddress, isAddressEqual, type Address } from "viem";
import { parseSiweMessage, validateSiweMessage } from "viem/siwe";

/** Host (+ port) from a WC metadata URL or page origin. */
export function originAuthority(dappUrl?: string | null): string | null {
  if (!dappUrl?.trim()) return null;
  const raw = dappUrl.trim();
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return u.host.toLowerCase() || null;
  } catch {
    const host = raw.replace(/^https?:\/\//i, "").split("/")[0]?.trim();
    return host ? host.toLowerCase() : null;
  }
}

export function looksLikeSiwe(message: string): boolean {
  return /wants you to sign in with your ethereum account/i.test(message);
}

export type SiweGateOk = {
  status: "ok";
  domain: string;
  statement?: string;
};

export type SiweGateBlocked = {
  status: "blocked";
  reason: string;
  messageDomain?: string;
  originHost?: string | null;
};

export type SiweGateResult =
  | { status: "not-siwe" }
  | SiweGateOk
  | SiweGateBlocked;

/**
 * If the text is a login (SIWE) message, the domain inside must match the
 * site that asked. Mismatch = phishing — refuse, no override.
 */
export function checkSiweGate(opts: {
  message: string;
  dappUrl?: string | null;
  address?: string | null;
  chainId?: number;
}): SiweGateResult {
  const text = opts.message || "";
  if (!looksLikeSiwe(text)) return { status: "not-siwe" };

  const parsed = parseSiweMessage(text);
  if (!parsed.domain || !parsed.address || !parsed.uri || !parsed.version) {
    return {
      status: "blocked",
      reason:
        "Looks like a login message but fields are incomplete or malformed — refuse",
    };
  }

  const originHost = originAuthority(opts.dappUrl);
  if (!originHost) {
    return {
      status: "blocked",
      reason:
        "Login message with no dApp origin — cannot verify domain; refuse",
      messageDomain: parsed.domain,
      originHost: null,
    };
  }

  const messageDomain = parsed.domain.toLowerCase();
  if (messageDomain !== originHost) {
    return {
      status: "blocked",
      reason: `Login domain “${parsed.domain}” does not match site “${originHost}” — phishing risk; refuse`,
      messageDomain: parsed.domain,
      originHost,
    };
  }

  if (
    !validateSiweMessage({
      message: parsed,
      domain: originHost,
      address: opts.address && isAddress(opts.address)
        ? (opts.address as Address)
        : undefined,
      time: new Date(),
    })
  ) {
    // Domain already matched; remaining fail = address / expiry / nonce shape.
    if (
      opts.address &&
      isAddress(opts.address) &&
      parsed.address &&
      isAddress(parsed.address) &&
      !isAddressEqual(parsed.address as Address, opts.address as Address)
    ) {
      return {
        status: "blocked",
        reason: "Login message address does not match your connected wallet — refuse",
        messageDomain: parsed.domain,
        originHost,
      };
    }
    if (parsed.expirationTime && new Date() >= parsed.expirationTime) {
      return {
        status: "blocked",
        reason: "Login message expired — refuse",
        messageDomain: parsed.domain,
        originHost,
      };
    }
    if (parsed.notBefore && new Date() < parsed.notBefore) {
      return {
        status: "blocked",
        reason: "Login message not valid yet — refuse",
        messageDomain: parsed.domain,
        originHost,
      };
    }
    // Nonce/version shape — still refuse signing a broken SIWE.
    return {
      status: "blocked",
      reason: "Login message failed SIWE checks (nonce/version/fields) — refuse",
      messageDomain: parsed.domain,
      originHost,
    };
  }

  if (
    opts.chainId != null &&
    parsed.chainId != null &&
    Number(parsed.chainId) !== Number(opts.chainId)
  ) {
    return {
      status: "blocked",
      reason: `Login chain ${parsed.chainId} ≠ session chain ${opts.chainId} — refuse`,
      messageDomain: parsed.domain,
      originHost,
    };
  }

  return {
    status: "ok",
    domain: parsed.domain,
    statement:
      typeof parsed.statement === "string" ? parsed.statement : undefined,
  };
}

/** Throw a short operator-facing error when SIWE is blocked. */
export function assertSiweAllowed(opts: {
  message: string;
  dappUrl?: string | null;
  address?: string | null;
  chainId?: number;
}): void {
  const g = checkSiweGate(opts);
  if (g.status === "blocked") throw new Error(g.reason);
}
