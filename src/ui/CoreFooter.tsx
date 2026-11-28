/**
 * Fine-print footer — core links live under SW (Other software).
 */
import { useState } from "react";
import { FOOTER_DONATION } from "../data/wallets";
import { t } from "../i18n/en";

/** Official core + scan + PUMP.tires — no GoPulse. Used by OtherSoftwareModal. */
export const FOOTER_CORE_IDS = [
  "pulsechain",
  "hex",
  "pulsex",
  "provex",
  "bridge",
  "pump-tires",
  "scan",
] as const;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function CoreFooter() {
  const [copied, setCopied] = useState(false);

  const copyDonate = async () => {
    try {
      await navigator.clipboard.writeText(FOOTER_DONATION.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <footer className="core-footer">
      <p className="core-footer-boast">{t("noCollect")}</p>
      <div className="core-footer-donate">
        <span className="core-footer-donate-label">{t("donateLabel")}</span>
        <code
          className="core-footer-donate-addr"
          title={FOOTER_DONATION.address}
        >
          {shortAddr(FOOTER_DONATION.address)}
        </code>
        <button
          type="button"
          className="core-footer-donate-copy"
          onClick={copyDonate}
        >
          {copied ? t("donateCopied") : t("donateCopy")}
        </button>
      </div>
    </footer>
  );
}
