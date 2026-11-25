/**
 * SYNC2 Pair QR — watch registry share (no seed).
 */
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  buildSyncUriFromAccounts,
  decodeSyncPayload,
  SYNC_QR_ACCOUNT_CAP,
} from "../chain/syncPair";
import { t } from "../i18n/en";

export function SyncPair(props: {
  accounts: {
    address: string;
    derivationIndex: number;
    derivationPath?: string;
  }[];
  watch?: { address: string; derivationIndex: number } | null;
  chainId: number;
  walletFingerprint: string;
  onImportText: (text: string) => void;
  busy?: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState("");
  const [pasteErr, setPasteErr] = useState<string | null>(null);

  const uri = useMemo(() => {
    if (!props.accounts.length && !props.watch) return null;
    const accounts =
      props.accounts.length > 0
        ? props.accounts
        : props.watch
          ? [
              {
                address: props.watch.address,
                derivationIndex: props.watch.derivationIndex,
              },
            ]
          : [];
    return buildSyncUriFromAccounts({
      accounts,
      watch: props.watch ?? null,
      chainId: props.chainId,
      walletFingerprint: props.walletFingerprint,
    });
  }, [
    props.accounts,
    props.watch,
    props.chainId,
    props.walletFingerprint,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      setDataUrl(null);
      return;
    }
    void QRCode.toDataURL(uri, {
      margin: 1,
      width: 180,
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
    <details className="receive-qr sync-pair">
      <summary>Pair watch list (QR / link)</summary>
      <div className="receive-qr-body">
        <p className="muted fee">
          Watch addresses only (max {SYNC_QR_ACCOUNT_CAP} in QR). Never seeds.
        </p>
        {uri ? (
          <>
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="Watch pair QR"
                width={180}
                height={180}
              />
            ) : (
              <p className="muted">QR unavailable — copy the link instead.</p>
            )}
            <p className="muted fee receive-uri">
              <code>{uri.slice(0, 72)}…</code>
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
              {copied ? t("copied") : t("copyPairLink")}
            </button>
          </>
        ) : (
          <p className="muted">{t("syncNeedAddress")}</p>
        )}

        <label className="field">
          {t("pastePairLink")}
          <textarea
            value={paste}
            onChange={(e) => {
              setPaste(e.target.value);
              setPasteErr(null);
            }}
            rows={3}
            spellCheck={false}
            placeholder="web+pulseperch://sync/v1/… or registry JSON"
          />
        </label>
        {pasteErr ? <p className="warn-line">{pasteErr}</p> : null}
        <button
          type="button"
          className="btn ghost"
          disabled={props.busy || !paste.trim()}
          onClick={() => {
            const dec = decodeSyncPayload(paste);
            if (!dec.ok) {
              setPasteErr(dec.error);
              return;
            }
            // Re-serialize for shared importer path
            const accounts = dec.import.accounts;
            if (!accounts.length && !dec.import.bookAdded) {
              setPasteErr("No addresses in payload.");
              return;
            }
            props.onImportText(
              JSON.stringify({
                kind: "pulse-watch-registry",
                version: 1,
                schemeId: dec.import.schemeId || "pqq-metamask-bip44-v1",
                chainId: dec.import.chainId || props.chainId,
                walletFingerprint: dec.import.walletFingerprint || "watch",
                highestIndexSeen: accounts.reduce(
                  (m, a) => Math.max(m, a.derivationIndex ?? 0),
                  -1,
                ),
                exportedAt: new Date().toISOString(),
                accounts: accounts.map((a) => ({
                  address: a.address,
                  index: a.derivationIndex ?? 0,
                  derivationPath: a.derivationPath,
                  schemeId: a.schemeId,
                })),
              }),
            );
            setPaste("");
            setPasteErr(null);
          }}
        >
          Import pair
        </button>
      </div>
    </details>
  );
}
