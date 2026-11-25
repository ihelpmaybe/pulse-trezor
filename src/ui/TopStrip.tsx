/**
 * Top address strip — copy face, forget watch, receive QR.
 */
import type { Address } from "viem";
import type { DeskChainId } from "../chain/client";
import { t } from "../i18n/en";
import { AddrParts } from "./AddrParts";
import { ReceiveQr } from "./ReceiveQr";

type Props = {
  activeAddress: Address | null;
  privacyHide: boolean;
  copied: boolean;
  onCopy: () => void;
  /** Saved watch address (may show after Disconnect). */
  watch: boolean;
  /** Live Suite session — can sign. */
  canSign: boolean;
  onForget: () => void;
  chainId: DeskChainId;
};

export function TopStrip({
  activeAddress,
  privacyHide,
  copied,
  onCopy,
  watch,
  canSign,
  onForget,
  chainId,
}: Props) {
  const watchOnly = !!activeAddress && watch && !canSign;
  return (
    <div className="top-strip">
      {activeAddress ? (
        <button
          type="button"
          className={watchOnly ? "addr-bar watch-only" : "addr-bar"}
          onClick={onCopy}
          title={
            privacyHide
              ? t("unhideToCopy")
              : watchOnly
                ? "Watching — bag only, not connected to sign. Forget to clear."
                : copied
                  ? t("copied")
                  : t("copyAddress")
          }
          aria-label={
            privacyHide
              ? t("addressHidden")
              : copied
                ? `Copied address ${activeAddress}`
                : watchOnly
                  ? `Watching ${activeAddress} — not connected`
                  : `Copy address ${activeAddress}`
          }
        >
          {watchOnly ? (
            <span className="addr-watch-chip">Watching</span>
          ) : null}
          <AddrParts address={activeAddress} />
          {copied ? (
            <span className="addr-copied" aria-hidden="true">
              {t("copied")}
            </span>
          ) : null}
          <svg
            className="addr-copy-icon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
          >
            <rect
              x="5.5"
              y="5.5"
              width="8"
              height="8"
              rx="1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
      {watchOnly ? (
        <button
          type="button"
          className="btn ghost addr-forget"
          onClick={onForget}
          title="Forget watched address"
        >
          Forget
        </button>
      ) : null}
      {activeAddress ? (
        <ReceiveQr address={activeAddress} chainId={chainId} />
      ) : null}
    </div>
  );
}
