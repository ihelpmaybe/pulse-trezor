/**
 * Approvals tab — scan + revoke open allowances (past grants).
 * New approve txs arrive via Apps (WalletConnect clear-sign) — not guessed here.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApprovalRow, ApprovalScanMeta } from "../chain/approvals";
import type { NftApprovalRow } from "../chain/nftApprovals";
import { t } from "../i18n/en";
import { shortAddr } from "./faceFormat";

type Props = {
  active: boolean;
  canSign: boolean;
  busy: boolean;
  approvals: ApprovalRow[];
  apprBusy: boolean;
  apprErr: string | null;
  apprMeta: ApprovalScanMeta | null;
  revokeSel: Set<string>;
  setRevokeSel: Dispatch<SetStateAction<Set<string>>>;
  approvalKey: (row: ApprovalRow) => string;
  refreshApprovals: () => void;
  onBulkRevoke: () => void;
  onRevoke: (row: ApprovalRow) => void;
  nftApprovals: NftApprovalRow[];
  onRevokeNft: (row: NftApprovalRow) => void;
};

export function ApprovePanel({
  active,
  canSign,
  busy,
  approvals,
  apprBusy,
  apprErr,
  apprMeta,
  revokeSel,
  setRevokeSel,
  approvalKey,
  refreshApprovals,
  onBulkRevoke,
  onRevoke,
  nftApprovals,
  onRevokeNft,
}: Props) {
  if (!active) {
    return <p className="muted">{t("approveConnect")}</p>;
  }

  return (
    <>
      <p className="muted fee">{t("approveHint")}</p>
      <div className="row nft-toolbar">
        <p className="muted nft-status">
          {apprBusy
            ? t("approveScanning")
            : apprErr
              ? apprErr
              : approvals.length
                ? `${approvals.length} open approval${approvals.length === 1 ? "" : "s"}`
                : t("approveNone")}
        </p>
        <button
          type="button"
          className="btn ghost"
          disabled={apprBusy}
          onClick={refreshApprovals}
        >
          {apprBusy ? "…" : t("approveScan")}
        </button>
      </div>
      {approvals.length ? (
        <>
          <div className="row revoke-bulk">
            <label className="hide-zero">
              <input
                type="checkbox"
                checked={
                  revokeSel.size > 0 && revokeSel.size === approvals.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setRevokeSel(new Set(approvals.map(approvalKey)));
                  } else {
                    setRevokeSel(new Set());
                  }
                }}
              />
              Select all
            </label>
            <button
              type="button"
              className="btn ghost"
              disabled={busy || !canSign || !revokeSel.size}
              onClick={onBulkRevoke}
            >
              Revoke selected ({revokeSel.size})
            </button>
          </div>
          <ul className="approval-list">
            {approvals.map((row) => {
              const k = approvalKey(row);
              return (
                <li key={k} className="approval-row">
                  <label className="approval-pick">
                    <input
                      type="checkbox"
                      checked={revokeSel.has(k)}
                      onChange={(e) => {
                        setRevokeSel((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(k);
                          else next.delete(k);
                          return next;
                        });
                      }}
                    />
                    <span className="approval-copy">
                      <span className="approval-sym">{row.symbol}</span>
                      <span className="muted">
                        → {row.spenderName} · {row.allowanceLabel}
                      </span>
                      <span className="muted approval-addr">
                        {shortAddr(row.spender)}
                      </span>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={busy || !canSign}
                    onClick={() => onRevoke(row)}
                    title={
                      canSign ? t("revokeOnTrezor") : t("revokeNeedConnect")
                    }
                  >
                    {t("revoke")}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      <p className="muted fee">
        {apprMeta
          ? `Checked ${apprMeta.tokensChecked} tokens · ${apprMeta.pairsChecked} pairs · via ${apprMeta.sources.join(" + ")}. `
          : ""}
        Revoke = approve(spender, 0) on Trezor.
      </p>

      {nftApprovals.length ? (
        <>
          <h3 className="approve-grant-h">NFT operators</h3>
          <ul className="approval-list">
            {nftApprovals.map((row) => (
              <li
                key={`${row.collection}-${row.operator}`}
                className="approval-row"
              >
                <div className="approval-copy">
                  <span className="approval-sym">{row.collectionName}</span>
                  <span className="muted">
                    → operator {shortAddr(row.operator)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy || !canSign}
                  onClick={() => onRevokeNft(row)}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
