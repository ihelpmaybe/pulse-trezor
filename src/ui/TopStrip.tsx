/**
 * Top address strip — copy face, forget watch, receive QR.
 */
import type { Address } from "viem";
import type { DeskChainId } from "../chain/client";
import { AddrParts } from "./AddrParts";
import { ReceiveQr } from "./ReceiveQr";

type Props = {
  activeAddress: Address | null;
  privacyHide: boolean;
  copied: boolean;
  onCopy: () => void;
  watch: boolean;
  onForget: () => void;
  chainId: DeskChainId;
};

export function TopStrip({
  activeAddress,
  privacyHide,
  copied,
  onCopy,
  watch,
  onForget,
  chainId,
}: Props) {
  return (
    <div className="top-strip">
      {activeAddress ? (
        <button
          type="button"
          className="addr-bar"
          onClick={onCopy}
          title={
            privacyHide
              ? "Unhide to copy address"
              : copied
                ? "Copied"
                : "Click to copy full address"
          }
          aria-label={
            privacyHide
              ? "Address hidden"
              : copied
                ? `Copied address ${activeAddress}`
                : `Copy address ${activeAddress}`
          }
        >
          <AddrParts address={activeAddress} />
          {copied ? (
            <span className="addr-copied" aria-hidden="true">
              Copied
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
      {watch ? (
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
