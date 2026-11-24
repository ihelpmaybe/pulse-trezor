/**
 * Face copy for viem / fetch RPC failures — no URL dumps or "Version: viem@".
 */

/** Hosts we clear from saved override (shut down / unusable from the desk). */
export const RETIRED_RPC_HOSTS = ["rpc-pulsechain.g4mm4.io"] as const;

export function isRetiredRpcUrl(url: string): boolean {
  const u = url.trim().toLowerCase().replace(/\/$/, "");
  return RETIRED_RPC_HOSTS.some(
    (h) => u === `https://${h}` || u.includes(`://${h}`),
  );
}

export function humanRpcError(raw: unknown): string {
  const s = raw instanceof Error ? raw.message : String(raw ?? "");
  const lower = s.toLowerCase();

  if (isRetiredRpcUrl(s) || lower.includes("g4mm4")) {
    return "G4mm4 RPC is shutting down. Switch to Official or PublicNode in Settings.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed")
  ) {
    return "Can't reach that PulseChain RPC. Pick another in Settings, or check your network.";
  }

  if (lower.includes("http request failed") || lower.includes("timeout")) {
    return "PulseChain RPC timed out or refused. Try Official or PublicNode in Settings.";
  }

  // Strip viem's multi-line dump if something slipped through.
  const first = s.split(/\n/)[0]?.trim() || s;
  if (first.length > 160) return `${first.slice(0, 157)}…`;
  return first;
}
