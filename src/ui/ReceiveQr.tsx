/**
 * Receive QR + EIP-681 URI — local qrcode lib, no third-party image host.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { parseEther, type Address } from "viem";
import { eip681PayNative, eip681Receive } from "../chain/eip681";
import type { DeskChainId } from "../chain/client";

export function ReceiveQr(props: {
  address: Address;
  chainId: DeskChainId;
}) {
  const [payAmt, setPayAmt] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  let uri = eip681Receive(props.address, props.chainId);
  try {
    if (payAmt.trim() && Number(payAmt) > 0) {
      uri = eip681PayNative(
        props.address,
        props.chainId,
        parseEther(payAmt.trim()),
      );
    }
  } catch {
    /* keep receive-only URI */
  }

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(uri, {
      margin: 1,
      width: 160,
      color: { dark: "#07060c", light: "#f0e8ff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <details className="receive-qr">
      <summary>Receive QR / EIP-681</summary>
      <div className="receive-qr-body">
        {dataUrl ? (
          <img src={dataUrl} alt="Receive address QR" width={160} height={160} />
        ) : (
          <p className="muted">QR unavailable — copy the URI instead.</p>
        )}
        <label className="field">
          Request amount (optional)
          <input
            value={payAmt}
            onChange={(e) => setPayAmt(e.target.value)}
            placeholder="0 = address only"
            inputMode="decimal"
          />
        </label>
        <p className="muted fee receive-uri">
          <code>{uri}</code>
        </p>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            void navigator.clipboard.writeText(uri).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied" : "Copy pay URI"}
        </button>
      </div>
    </details>
  );
}
