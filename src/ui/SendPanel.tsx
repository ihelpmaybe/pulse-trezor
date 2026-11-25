/**
 * Send tab — recipient, gas speed, custom call, stuck tx.
 */
import type { Dispatch, SetStateAction } from "react";
import {
  isAddress,
  parseEther,
  type Address,
  type Hash,
} from "viem";
import {
  bookLabel,
  isKnownRecipient,
  sendLookalikePoison,
  upsertAddressBook,
  type BookEntry,
} from "../chain/addressBook";
import type { ActivityRow } from "../chain/activity";
import {
  explorerTxUrl,
  isNativeAsset,
  type DeskChainId,
  type RpcOverride,
} from "../chain/client";
import type { CustomToken } from "../chain/customTokens";
import {
  deadEndNativeSend,
  deadEndTokenTransfer,
} from "../chain/deadEndRecipients";
import { GAS_TIER_PILLS, type GasSpeed } from "../chain/gasOracle";
import type { FullBag } from "../chain/portfolio";
import {
  encodeErc20Transfer,
  parseTokenAmount,
  type PackToken,
} from "../chain/tokens";
import { t } from "../i18n/en";
import { rbfPendingHint, rbfSoftCoach } from "../trezor/rbfSoftPath";
import {
  sendPhaseLabel,
  type FeePreview,
  type SendPhase,
} from "../trezor/signPulseTx";
import { gasUnitLabel, shortAddr } from "./faceFormat";
import { TxExplain } from "./TxExplain";

type TokenRow = { token: PackToken; raw: bigint; formatted: string };
type SelectedToken = {
  address: Address | string;
  symbol: string;
  decimals: number;
} | null;
type TxStatus = "pending" | "confirmed" | "reverted" | "timeout" | null;

export type SendPanelProps = {
  canSign: boolean;
  chainId: DeskChainId;
  sessionAddress: Address | null;
  balance: bigint | null;
  asset: "PLS" | string;
  to: string;
  setTo: (v: string) => void;
  setErr: (v: string | null) => void;
  addressBook: BookEntry[];
  setAddressBook: (b: BookEntry[]) => void;
  bookLabelDraft: string;
  setBookLabelDraft: (v: string) => void;
  activity: ActivityRow[];
  amount: string;
  setAmount: (v: string) => void;
  selectedToken: SelectedToken;
  tokenRows: TokenRow[];
  customRows: { token: CustomToken; raw: bigint; formatted: string }[];
  fullBag: FullBag | null;
  onMaxSend: () => void;
  nonceHint: number | null;
  nonceOverride: string;
  setNonceOverride: (v: string) => void;
  feeHint: string | null;
  feePreview: FeePreview | null;
  gasSpeed: GasSpeed;
  setGasSpeed: (s: GasSpeed) => void;
  tipGwei: string;
  setTipGwei: (v: string) => void;
  maxFeeGwei: string;
  setMaxFeeGwei: (v: string) => void;
  applyGasSpeed: (preview: FeePreview | null, speed: GasSpeed) => void;
  effectiveRpc: RpcOverride | undefined;
  busy: boolean;
  /** MEW-style: prepare → confirm on device → broadcast (signed ≠ sent). */
  sendPhase?: SendPhase | null;
  mainnetSendAcked: boolean;
  mainnetSendAck: boolean;
  setMainnetSendAck: (v: boolean) => void;
  poisonAck: boolean;
  setPoisonAck: (v: boolean) => void;
  onSend: () => void;
  customCallOpen: boolean;
  setCustomCallOpen: Dispatch<SetStateAction<boolean>>;
  callTo: string;
  setCallTo: (v: string) => void;
  callData: string;
  setCallData: (v: string) => void;
  onCustomCall: () => void;
  lastTx: Hash | null;
  setLastTx: (h: Hash | null) => void;
  txStatus: TxStatus;
  setTxStatus: (s: TxStatus) => void;
  hashCopied: boolean;
  setHashCopied: (v: boolean) => void;
  onSpeedUp: () => void;
  onCancelStuck: () => void;
};

export function SendPanel({
  canSign,
  chainId,
  sessionAddress,
  balance,
  asset,
  to,
  setTo,
  setErr,
  addressBook,
  setAddressBook,
  bookLabelDraft,
  setBookLabelDraft,
  activity,
  amount,
  setAmount,
  selectedToken,
  tokenRows,
  customRows,
  fullBag,
  onMaxSend,
  nonceHint,
  nonceOverride,
  setNonceOverride,
  feeHint,
  feePreview,
  gasSpeed,
  setGasSpeed,
  tipGwei,
  setTipGwei,
  maxFeeGwei,
  setMaxFeeGwei,
  applyGasSpeed,
  effectiveRpc,
  busy,
  sendPhase = null,
  mainnetSendAcked,
  mainnetSendAck,
  setMainnetSendAck,
  poisonAck,
  setPoisonAck,
  onSend,
  customCallOpen,
  setCustomCallOpen,
  callTo,
  setCallTo,
  callData,
  setCallData,
  onCustomCall,
  lastTx,
  setLastTx,
  txStatus,
  setTxStatus,
  hashCopied,
  setHashCopied,
  onSpeedUp,
  onCancelStuck,
}: SendPanelProps) {
  if (!canSign) return null;

  const amountOver = (() => {
    try {
      if (!amount.trim()) return false;
      if (isNativeAsset(asset, chainId) && balance != null) {
        return parseEther(amount.trim()) > balance;
      }
      if (selectedToken) {
        const raw = parseTokenAmount(amount.trim(), selectedToken.decimals);
        const have =
          tokenRows.find(
            (r) =>
              r.token.address.toLowerCase() ===
              selectedToken.address.toLowerCase(),
          )?.raw ??
          customRows.find(
            (r) =>
              r.token.address.toLowerCase() ===
              selectedToken.address.toLowerCase(),
          )?.raw ??
          fullBag?.tokens.find(
            (t) =>
              t.address.toLowerCase() === selectedToken.address.toLowerCase(),
          )?.raw;
        return have != null && raw > have;
      }
      return false;
    } catch {
      return false;
    }
  })();

  const dead =
    to && isAddress(to)
      ? isNativeAsset(asset, chainId)
        ? deadEndNativeSend(to, "0x")
        : selectedToken
          ? deadEndTokenTransfer(selectedToken.address, to)
          : null
      : null;
  const poison =
    to && isAddress(to)
      ? sendLookalikePoison(to, addressBook, activity)
      : null;

  const recentOut = Array.from(
    new Set(
      activity
        .filter((a) => a.direction === "out" && a.counterparty)
        .map((a) => a.counterparty!.toLowerCase()),
    ),
  )
    .filter(
      (addr) => !addressBook.some((b) => b.address.toLowerCase() === addr),
    )
    .slice(0, 4);

  const feeShort = feeHint
    ? feeHint.replace(/\s*·\s*testnets can be wild/i, "").split(" · ")[0]
    : null;

  return (
    <>
      {chainId === 369 &&
      balance != null &&
      balance === 0n &&
      isNativeAsset(asset, chainId) ? (
        <p className="muted empty-teach">
          Bag is 0 PLS — bridge / receive, or use testnet.
        </p>
      ) : null}

      <label className="field">
        To
        <span className="amount-row">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value.trim())}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            list="perch-address-book"
          />
          <button
            type="button"
            className="btn ghost gas-pill"
            onClick={() => {
              void navigator.clipboard.readText().then(
                (clip) => {
                  const v = clip.trim();
                  if (v) setTo(v);
                },
                () => setErr("Clipboard paste blocked by browser."),
              );
            }}
          >
            Paste
          </button>
        </span>
      </label>
      <datalist id="perch-address-book">
        {addressBook.map((b) => (
          <option key={b.address} value={b.address} label={b.label} />
        ))}
      </datalist>

      {dead ? (
        <p className="warn-line" role="alert">
          Blocked · {dead.name}: {dead.reason}
        </p>
      ) : null}
      {poison ? (
        <div className="poison-ack-box" role="alert">
          <p className="warn-line">
            Lookalike of “{poison.label}” — check every character on Trezor.
          </p>
          <label className="blind-ack">
            <input
              type="checkbox"
              checked={poisonAck}
              onChange={(e) => setPoisonAck(e.target.checked)}
            />
            <span>Not “{poison.label}” — I checked the full address.</span>
          </label>
        </div>
      ) : null}

      <label className="field">
        Amount
        <span className="amount-row">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.01"
            inputMode="decimal"
          />
          <button
            type="button"
            className="btn ghost gas-pill"
            disabled={
              isNativeAsset(asset, chainId) ? balance == null : !selectedToken
            }
            onClick={onMaxSend}
          >
            Max
          </button>
        </span>
      </label>
      {amountOver ? (
        <p className="warn-line">Amount exceeds balance.</p>
      ) : null}

      <div className="gas-speed" role="group" aria-label="Send speed">
        <span className="gas-speed-label">Speed</span>
        {GAS_TIER_PILLS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={
              gasSpeed === id ? "btn gas-pill on" : "btn ghost gas-pill"
            }
            disabled={!feePreview && id !== "standard"}
            onClick={() => applyGasSpeed(feePreview, id)}
          >
            {label}
          </button>
        ))}
      </div>
      {feeShort ? (
        <p className="muted fee send-fee-one-liner" title={feeHint ?? undefined}>
          {feeShort}
          {tipGwei && gasSpeed !== "standard"
            ? ` · ${gasSpeed} tip ${tipGwei} ${gasUnitLabel(chainId)}`
            : ""}
        </p>
      ) : null}

      {chainId === 369 && !mainnetSendAcked ? (
        <label className="blind-ack">
          <input
            type="checkbox"
            checked={mainnetSendAck}
            onChange={(e) => setMainnetSendAck(e.target.checked)}
          />
          <span>First mainnet send — I will read To + amount on Trezor.</span>
        </label>
      ) : null}

      <button
        type="button"
        className="btn"
        disabled={
          busy ||
          !to ||
          !amount ||
          amountOver ||
          !!dead ||
          (chainId === 369 && !mainnetSendAcked && !mainnetSendAck) ||
          (!!poison && !poisonAck)
        }
        onClick={onSend}
      >
        {busy ? sendPhaseLabel(sendPhase) : t("signSend")}
      </button>
      {busy && sendPhase === "broadcast" ? (
        <p className="muted fee" role="status">
          Signed — broadcasting…
        </p>
      ) : null}

      {lastTx ? (
        <div className="stuck-box">
          <p>
            Tx{" "}
            <a
              className="link"
              href={explorerTxUrl(chainId, lastTx)}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddr(lastTx)}
            </a>
            {txStatus ? <span className="muted"> · {txStatus}</span> : null}
          </p>
          <div className="row">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                void navigator.clipboard.writeText(lastTx).then(() => {
                  setHashCopied(true);
                  window.setTimeout(() => setHashCopied(false), 1500);
                });
              }}
            >
              {hashCopied ? "Copied" : "Copy hash"}
            </button>
            {txStatus === "confirmed" || txStatus === "reverted" ? (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setLastTx(null);
                  setTxStatus(null);
                }}
              >
                Clear
              </button>
            ) : null}
            {txStatus === "pending" || txStatus === "timeout" ? (
              <>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={onSpeedUp}
                  title={rbfPendingHint()}
                >
                  {t("speedUpShort")}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={onCancelStuck}
                  title={rbfSoftCoach()}
                >
                  {t("cancelShort")}
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <details className="gas-details send-more">
        <summary>More</summary>
        {(addressBook.length > 0 || recentOut.length > 0) && (
          <div className="book-chips" role="list">
            {addressBook.slice(0, 8).map((b) => (
              <button
                key={b.address}
                type="button"
                role="listitem"
                className={
                  to.toLowerCase() === b.address.toLowerCase()
                    ? "btn gas-pill on"
                    : "btn ghost gas-pill"
                }
                onClick={() => setTo(b.address)}
                title={b.address}
              >
                {b.label || shortAddr(b.address)}
              </button>
            ))}
            {recentOut.map((addr) => (
              <button
                key={addr}
                type="button"
                role="listitem"
                className={
                  to.toLowerCase() === addr
                    ? "btn gas-pill on"
                    : "btn ghost gas-pill"
                }
                onClick={() => setTo(addr)}
                title={addr}
              >
                {shortAddr(addr)}
              </button>
            ))}
          </div>
        )}
        {to && isAddress(to) && !isKnownRecipient(to) ? (
          <div className="row revoke-bulk">
            <input
              className="book-label-in"
              value={bookLabelDraft}
              onChange={(e) => setBookLabelDraft(e.target.value)}
              placeholder="label"
            />
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setAddressBook(
                  upsertAddressBook(to, bookLabelDraft || shortAddr(to)),
                );
                setBookLabelDraft("");
              }}
            >
              Save to book
            </button>
          </div>
        ) : to && isAddress(to) && isKnownRecipient(to) ? (
          <p className="muted fee">Book: {bookLabel(to)}</p>
        ) : null}

        <label className="field">
          Nonce{nonceHint != null ? ` (pending ${nonceHint})` : ""}
          <input
            value={nonceOverride}
            onChange={(e) => setNonceOverride(e.target.value)}
            placeholder="auto"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>

        <div className="gas-grid">
          <label className="field">
            Tip ({gasUnitLabel(chainId)})
            <input
              value={tipGwei}
              onChange={(e) => {
                setTipGwei(e.target.value);
                setGasSpeed(e.target.value.trim() ? "fast" : "standard");
              }}
              placeholder="auto"
              inputMode="decimal"
              autoComplete="off"
            />
          </label>
          <label className="field">
            Max fee
            <input
              value={maxFeeGwei}
              onChange={(e) => {
                setMaxFeeGwei(e.target.value);
                if (e.target.value.trim()) setGasSpeed("fast");
              }}
              placeholder="auto"
              inputMode="decimal"
              autoComplete="off"
            />
          </label>
        </div>

        {to && isAddress(to) ? (
          <TxExplain
            chainId={chainId}
            account={sessionAddress}
            to={
              isNativeAsset(asset, chainId)
                ? to
                : (selectedToken?.address as string) || to
            }
            data={
              isNativeAsset(asset, chainId)
                ? "0x"
                : selectedToken
                  ? encodeErc20Transfer(
                      to as Address,
                      parseTokenAmount(
                        amount || "0",
                        selectedToken.decimals,
                      ),
                    )
                  : "0x"
            }
            valueWei={
              isNativeAsset(asset, chainId) && amount.trim()
                ? (() => {
                    try {
                      return parseEther(amount.trim());
                    } catch {
                      return 0n;
                    }
                  })()
                : 0n
            }
            rpc={effectiveRpc}
          />
        ) : null}

        <details
          className="gas-details"
          open={customCallOpen}
          onToggle={(e) =>
            setCustomCallOpen((e.target as HTMLDetailsElement).open)
          }
        >
          <summary>Custom call</summary>
          <label className="field">
            Contract
            <input
              value={callTo}
              onChange={(e) => setCallTo(e.target.value.trim())}
              placeholder="0x…"
              spellCheck={false}
            />
          </label>
          <label className="field">
            Calldata
            <input
              value={callData}
              onChange={(e) => setCallData(e.target.value.trim())}
              placeholder="0x…"
              spellCheck={false}
            />
          </label>
          {callTo && isAddress(callTo) ? (
            <TxExplain
              chainId={chainId}
              account={sessionAddress}
              to={callTo}
              data={callData.trim() || "0x"}
              rpc={effectiveRpc}
            />
          ) : null}
          <button
            type="button"
            className="btn ghost"
            disabled={busy || !callTo}
            onClick={onCustomCall}
          >
            Sign call
          </button>
        </details>
      </details>
    </>
  );
}
