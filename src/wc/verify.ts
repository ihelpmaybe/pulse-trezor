/**
 * WalletConnect / Reown Verify API mapping for session proposals & requests.
 * Docs: https://docs.walletconnect.com/wallets/web/verify
 */
export type VerifyState =
  | "DOMAIN_MATCH"
  | "UNVERIFIED"
  | "MISMATCH"
  | "THREAT";

export type VerifyContextLike = {
  verified?: {
    validation?: string;
    isScam?: boolean;
    origin?: string | null;
  };
} | null;

function validationUpper(validation?: string): string {
  return String(validation || "").toUpperCase();
}

export function getVerifyState(
  verifyContext?: VerifyContextLike,
): VerifyState {
  const v = verifyContext?.verified;
  if (!v) return "UNVERIFIED";
  if (v.isScam) return "THREAT";
  switch (validationUpper(v.validation)) {
    case "VALID":
      return "DOMAIN_MATCH";
    case "INVALID":
      return "MISMATCH";
    default:
      return "UNVERIFIED";
  }
}

export function verifyFace(state: VerifyState): {
  tone: "ok" | "warn" | "danger";
  title: string;
  detail: string;
  needsAck: boolean;
} {
  switch (state) {
    case "DOMAIN_MATCH":
      return {
        tone: "ok",
        title: "Verify · domain match",
        detail: "Reown Verify says this domain matches the registered app",
        needsAck: false,
      };
    case "UNVERIFIED":
      return {
        tone: "warn",
        title: "Verify · cannot verify",
        detail:
          "Domain not in Verify registry (common for small Pulse apps) — check the URL yourself",
        needsAck: false,
      };
    case "MISMATCH":
      return {
        tone: "danger",
        title: "Verify · domain mismatch",
        detail:
          "Sender domain does not match the app’s registered domain — classic phishing pattern",
        needsAck: true,
      };
    case "THREAT":
      return {
        tone: "danger",
        title: "Verify · SECURITY RISK",
        detail:
          "Domain flagged malicious by WalletConnect threat feeds — refuse unless you are sure this is a false positive",
        needsAck: true,
      };
  }
}
