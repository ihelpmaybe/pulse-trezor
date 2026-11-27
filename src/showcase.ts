/** Hub Pages = look-only. Wallet Connect / spend stays on local ZIP or localhost. */
export function isShowcase(): boolean {
  if (import.meta.env.VITE_SHOWCASE === "1" || import.meta.env.VITE_SHOWCASE === "true") {
    return true;
  }
  if (typeof window !== "undefined") {
    try {
      if (/\.github\.io$/i.test(window.location.hostname)) return true;
    } catch {
      /* */
    }
  }
  return false;
}

export const PERCH_RELEASES =
  "https://github.com/ihelpmaybe/pulse-trezor/releases/latest";
export const PERCH_REPO = "https://github.com/ihelpmaybe/pulse-trezor";
export const PERCH_INSTALL =
  "https://github.com/ihelpmaybe/pulse-trezor/blob/main/INSTALL.md";
