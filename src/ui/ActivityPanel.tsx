/**
 * Activity card — PulseScan feed, poison flags, stuck-tx shortcuts.
 */
import type { Address, Hash } from "viem";
import {
  activityPoison,
  bookLabel,
  type BookEntry,
} from "../chain/addressBook";
import {
  fullWhen,
  shortWhen,
  type ActivityRow,
} from "../chain/activity";
import type { DeskChainId } from "../chain/client";
import { fmtActivityAmtParts } from "./faceFormat";

type ActFilter = "all" | "in" | "out";
type TxStatus = "pending" | "confirmed" | "reverted" | "timeout" | null;

type Props = {
  active: { address: Address } | null;
  session: boolean;
  chainId: DeskChainId;
  activity: ActivityRow[];
  actBusy: boolean;
  actErr: string | null;
  actFilter: ActFilter;
  setActFilter: (f: ActFilter) => void;
  actLimit: number;
  setActLimit: (n: number) => void;
  refreshActivity: (
    address: Address,
    chainId: DeskChainId,
    limit?: number,
  ) => void | Promise<void>;
  addressBook: BookEntry[];
  lastTx: Hash | null;
  txStatus: TxStatus;
  busy: boolean;
  onSpeedUp: () => void;
  onCancelStuck: () => void;
};

export function ActivityPanel({
  active,
  session,
  chainId,
  activity,
  actBusy,
  actErr,
  actFilter,
  setActFilter,
  actLimit,
  setActLimit,
  refreshActivity,
  addressBook,
  lastTx,
  txStatus,
  busy,
  onSpeedUp,
  onCancelStuck,
}: Props) {
  return (
    <section className="card activity">
      <div className="device-head activity-head">
        <h2>Activity</h2>
        {active ? (
          <div className="row activity-tools">
            <div className="gas-speed" role="group" aria-label="Activity filter">
              {(
                [
                  ["all", "All"],
                  ["in", "In"],
                  ["out", "Out"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={
                    actFilter === id ? "btn gas-pill on" : "btn ghost gas-pill"
                  }
                  onClick={() => setActFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn ghost gas-pill"
              disabled={actBusy}
              onClick={() => void refreshActivity(active.address, chainId)}
            >
              {actBusy ? "…" : "↻"}
            </button>
          </div>
        ) : null}
      </div>
      {!active ? (
        <p className="muted empty-teach">
          Next: Connect, then Refresh here for recent PulseScan txs.
        </p>
      ) : actErr ? (
        <p className="muted">{actErr}</p>
      ) : actBusy && !activity.length ? (
        <p className="muted">…</p>
      ) : !activity.length ? (
        <p className="muted">No recent txs on this chain.</p>
      ) : (
        <ul className="activity-list">
          {lastTx &&
          txStatus === "pending" &&
          !activity.some(
            (a) => a.hash.toLowerCase() === lastTx.toLowerCase(),
          ) ? (
            <li className="activity-row pending">
              <button
                type="button"
                className="activity-dir"
                title={`Copy ${lastTx}`}
                onClick={() => {
                  void navigator.clipboard.writeText(lastTx);
                }}
              >
                …
              </button>
              <span className="activity-amt">
                <span className="activity-int">…</span>
                <span className="activity-frac" />
              </span>
              <span className="activity-when">mining</span>
              {(txStatus === "pending" || txStatus === "timeout") && session ? (
                <span className="row activity-stuck">
                  <button
                    type="button"
                    className="btn ghost gas-pill"
                    disabled={busy}
                    onClick={onSpeedUp}
                  >
                    Speed up
                  </button>
                  <button
                    type="button"
                    className="btn ghost gas-pill"
                    disabled={busy}
                    onClick={onCancelStuck}
                  >
                    Cancel
                  </button>
                </span>
              ) : null}
            </li>
          ) : null}
          {(() => {
            const poisonPeers: { address: string; label: string }[] = [
              ...addressBook.map((b) => ({
                address: b.address,
                label: b.label,
              })),
            ];
            const seen = new Set(
              poisonPeers.map((p) => p.address.toLowerCase()),
            );
            for (const a of activity) {
              if (a.direction !== "out" || !a.counterparty) continue;
              const k = a.counterparty.toLowerCase();
              if (seen.has(k)) continue;
              seen.add(k);
              poisonPeers.push({
                address: a.counterparty,
                label:
                  bookLabel(a.counterparty) ||
                  `${a.counterparty.slice(0, 6)}…${a.counterparty.slice(-4)}`,
              });
            }
            return activity
              .filter((row) =>
                actFilter === "all" ? true : row.direction === actFilter,
              )
              .map((row) => {
                const parts =
                  !row.method && Number(row.valueEth) !== 0
                    ? fmtActivityAmtParts(row.valueEth)
                    : null;
                const dirLabel =
                  row.direction === "in"
                    ? "In"
                    : row.direction === "out"
                      ? "Out"
                      : row.direction === "self"
                        ? "Self"
                        : row.direction;
                const poison = activityPoison(row, poisonPeers);
                const poisonTitle = poison
                  ? poison.direction === "in"
                    ? `Possible poison${poison.dust ? " dust" : ""} — lookalike of “${poison.label}”. Don’t copy this sender as a recipient.`
                    : `Lookalike of “${poison.label}” — confirm full address before trusting this Out.`
                  : undefined;
                return (
                  <li
                    key={row.hash}
                    className={
                      poison
                        ? poison.dust
                          ? "activity-row poison dust"
                          : "activity-row poison"
                        : "activity-row"
                    }
                  >
                    <button
                      type="button"
                      className={`activity-dir ${row.direction}`}
                      title={`Copy ${row.hash}`}
                      onClick={() => {
                        void navigator.clipboard.writeText(row.hash);
                      }}
                    >
                      {dirLabel}
                    </button>
                    <span
                      className="activity-amt"
                      title={
                        row.asset || row.method
                          ? `${row.asset || row.method} · ${row.valueEth}`
                          : row.valueEth
                      }
                    >
                      {parts ? (
                        <>
                          <span className="activity-int">{parts.int}</span>
                          <span className="activity-frac">
                            {parts.frac != null ? `.${parts.frac}` : ""}
                          </span>
                          {row.asset && row.asset !== "PLS" ? (
                            <span className="activity-asset">
                              {" "}
                              {row.asset}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="activity-int method">
                          {row.method || "—"}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        poison ? "activity-poison on" : "activity-poison"
                      }
                      title={poisonTitle}
                      aria-label={poisonTitle}
                    >
                      {poison ? "!" : ""}
                    </span>
                    <span
                      className="activity-when"
                      title={fullWhen(row.timestamp) || undefined}
                    >
                      {shortWhen(row.timestamp)}
                    </span>
                  </li>
                );
              });
          })()}
        </ul>
      )}
      {active && activity.length > 0 ? (
        <button
          type="button"
          className="btn ghost"
          disabled={actBusy}
          onClick={() => {
            const next = actLimit + 24;
            setActLimit(next);
            void refreshActivity(active.address, chainId, next);
          }}
        >
          {actBusy ? "…" : "Load more history"}
        </button>
      ) : null}
    </section>
  );
}
