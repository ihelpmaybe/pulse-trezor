import { FOOTER_DONATION } from "./wallets";

export const DONATE_JSON_URL = "https://ihelpmaybe.github.io/donate.json";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export type DonateResolved = {
  label: string;
  address: string;
  source: "remote" | "fallback";
};

export async function resolveDonate(
  fallback: { label: string; address: string } = {
    label: "Donate (PLS / PulseChain)",
    address: FOOTER_DONATION.address,
  },
  timeoutMs = 2500,
): Promise<DonateResolved> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(DONATE_JSON_URL, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return { ...fallback, source: "fallback" };
    const data = (await res.json()) as {
      pulse?: { label?: string; address?: string };
      label?: string;
      address?: string;
    };
    const address = data.pulse?.address ?? data.address ?? "";
    if (!ADDR_RE.test(address)) return { ...fallback, source: "fallback" };
    return {
      label: data.pulse?.label ?? data.label ?? fallback.label,
      address,
      source: "remote",
    };
  } catch {
    return { ...fallback, source: "fallback" };
  } finally {
    window.clearTimeout(timer);
  }
}
