/**
 * Approvals tab — scan / revoke ERC-20 + NFT operators + grant.
 */
import type { Dispatch, SetStateAction } from "react";
import { isAddress, type Address } from "viem";
import { bookLabel } from "../chain/addressBook";
import {
  KNOWN_SPENDERS,
  type ApprovalRow,
  type ApprovalScanMeta,
} from "../chain/approvals";
import type { NftApprovalRow } from "../chain/nftApprovals";
import { shortAddr } from "./faceFormat";

type SelectedToken = {
  address: Address | string;
  symbol: string;
  decimals: number;
} | null;

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
  selectedToken: SelectedToken;
  spender: string;
  setSpender: (v: string) => void;
  approveAmt: string;
  setApproveAmt: (v: string) => void;
  approveMaxAck: boolean;
  setApproveMaxAck: (v: boolean) => void;
  onApprove: (unlimited: boolean) => void;
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
  selectedToken,
  spender,
  setSpender,
  approveAmt,
  setApproveAmt,
  approveMaxAck,
  setApproveMaxAck,
  onApprove,
}: Props) {
  if (!active) {
    return <p className="muted">Connect to load approvals.</p>;
  }

  return (
    <>
      <div className="row nft-toolbar">
        <p className="muted nft-status">
          {apprBusy
            ? "Deep scan — history, bag tokens, Approval logs…"
            : apprErr
              ? apprErr
              : approvals.length
                ? `${approvals.length} open approval${approvals.length === 1 ? "" : "s"}`
                : "No open allowances in coverage."}
        </p>
        <button
          type="button"
          className="btn ghost"
          disabled={apprBusy}
          onClick={refreshApprovals}
        >
          {apprBusy ? "…" : "Scan"}
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
                      canSign
                        ? "Set allowance to 0 on Trezor"
                        : "Connect Trezor to revoke"
                    }
                  >
                    Revoke
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
        Live allowance on your RPC. Revoke = approve(spender, 0) on Trezor.
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

      <h3 className="approve-grant-h">Grant</h3>
      {!canSign ? (
        <p className="muted">Connect Trezor to grant approve.</p>
      ) : (
        <>
          <p className="muted">
            Token:{" "}
            <strong>
              {selectedToken ? selectedToken.symbol : "pick from balances"}
            </strong>
          </p>
          <label className="field">
            Spender
            <input
              value={spender}
              onChange={(e) => setSpender(e.target.value.trim())}
              placeholder="0x… or PulseX router"
              spellCheck={false}
            />
          </label>
          <div className="book-chips" role="list">
            {KNOWN_SPENDERS.map((s) => (
              <button
                key={s.address}
                type="button"
                role="listitem"
                className={
                  spender.toLowerCase() === s.address.toLowerCase()
                    ? "btn gas-pill on"
                    : "btn ghost gas-pill"
                }
                onClick={() => setSpender(s.address)}
                title={s.address}
              >
                {s.name}
              </button>
            ))}
          </div>
          {spender && isAddress(spender) ? (
            <p
              className={
                KNOWN_SPENDERS.some(
                  (s) => s.address.toLowerCase() === spender.toLowerCase(),
                )
                  ? "muted fee"
                  : "warn-line"
              }
            >
              Clear-sign: spender {shortAddr(spender)}
              {KNOWN_SPENDERS.find(
                (s) => s.address.toLowerCase() === spender.toLowerCase(),
              )
                ? ` · ${
                    KNOWN_SPENDERS.find(
                      (k) =>
                        k.address.toLowerCase() === spender.toLowerCase(),
                    )!.name
                  }`
                : " · unknown — read Trezor"}
              {bookLabel(spender) ? ` · book: ${bookLabel(spender)}` : ""}
            </p>
          ) : null}
          <label className="field">
            Amount
            <input
              value={approveAmt}
              onChange={(e) => setApproveAmt(e.target.value)}
              placeholder="exact amount"
              inputMode="decimal"
            />
          </label>
          <div className="row">
            <button
              type="button"
              className="btn"
              disabled={busy || !spender || !selectedToken}
              onClick={() => onApprove(false)}
            >
              Approve amount
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={busy || !spender || !selectedToken || !approveMaxAck}
              onClick={() => onApprove(true)}
            >
              Approve max
            </button>
          </div>
          <label className="blind-ack">
            <input
              type="checkbox"
              checked={approveMaxAck}
              onChange={(e) => setApproveMaxAck(e.target.checked)}
            />
            <span>
              Unlimited approve — this spender can drain the whole token
              balance until I revoke. I will read the Trezor screen.
            </span>
          </label>
          <p className="warn-line">
            Prefer exact amount when you can. Max = unlimited.
          </p>
        </>
      )}
    </>
  );
}
