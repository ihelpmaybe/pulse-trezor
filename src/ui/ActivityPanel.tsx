/**
 * Activity feed — PulseScan, poison flags, stuck-tx shortcuts.
 * Dense grid on wide panels (ui-real-estate) + infinite scroll.
 * Prefer embedded inside BagPanel tabs; standalone card kept for tests.
 */
import { useEffect, useRef } from "react";
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
import { t } from "../i18n/en";
import { fmtActivityAmtParts } from "./faceFormat";

type ActFilter = "all" | "in" | "out";
type TxStatus = "pending" | "confirmed" | "reverted" | "timeout" | null;

type Props = {
  /** When true, render as bag tab body (no outer card / h2). */
  embedded?: boolean;
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
  actHasMore: boolean;
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

function shortPeer(addr: string | null | undefined): string | null {
  if (!addr) return null;
  const label = bookLabel(addr);
  if (label) return label;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ActivityPanel({
  embedded = false,
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
  actHasMore,
  refreshActivity,
  addressBook,
  lastTx,
  txStatus,
  busy,
  onSpeedUp,
  onCancelStuck,
}: Props) {
  const poisonPeers: { address: string; label: string }[] = [
    ...addressBook.map((b) => ({
      address: b.address,
      label: b.label,
    })),
  ];
  const seen = new Set(poisonPeers.map((p) => p.address.toLowerCase()));
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

  const filtered = activity.filter((row) =>
    actFilter === "all" ? true : row.direction === actFilter,
  );
  const inN = activity.filter((r) => r.direction === "in").length;
  const outN = activity.filter((r) => r.direction === "out").length;
  const poisonN = activity.filter((r) => activityPoison(r, poisonPeers)).length;
  const showPending =
    !!lastTx &&
    txStatus === "pending" &&
    !activity.some((a) => a.hash.toLowerCase() === lastTx.toLowerCase());

  const moreRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!active || !actHasMore || actBusy) return;
    const el = moreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (actBusy || !actHasMore) return;
        const next = actLimit + 48;
        setActLimit(next);
        void refreshActivity(active.address, chainId, next);
      },
      { root: null, rootMargin: "160px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [
    active,
    actHasMore,
    actBusy,
    actLimit,
    chainId,
    refreshActivity,
    setActLimit,
  ]);

  const body = (
    <>
      <div className="device-head activity-head">
        {embedded ? null : <h2>Activity</h2>}
        {active ? (
          <div className="row activity-tools">
            <div
              className="gas-speed"
              role="group"
              aria-label={t("activityFilter")}
            >
              {(
                [
                  ["all", t("activityAll")],
                  ["in", t("activityIn")],
                  ["out", t("activityOut")],
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
      {!active ? null : actErr ? (
        <p className="muted">{actErr}</p>
      ) : actBusy && !activity.length ? (
        <p className="muted">…</p>
      ) : !activity.length && !showPending ? (
        <p className="muted">{t("activityEmpty")}</p>
      ) : (
        <>
          {activity.length > 0 ? (
            <p className="activity-summary" role="status">
              {activity.length} tx
              {activity.length === 1 ? "" : "s"}
              <span className="activity-summary-meta">
                {" "}
                · {inN} in · {outN} out
                {poisonN ? ` · ${poisonN} flag` : ""}
                {actFilter !== "all" ? ` · showing ${filtered.length}` : ""}
              </span>
            </p>
          ) : null}
          <ul className="activity-list">
            {showPending ? (
              <li className="activity-row pending">
                <button
                  type="button"
                  className="activity-dir"
                  title={`Copy ${lastTx}`}
                  onClick={() => {
                    void navigator.clipboard.writeText(lastTx!);
                  }}
                >
                  …
                </button>
                <span className="activity-amt">
                  <span className="activity-int">…</span>
                  <span className="activity-frac" />
                </span>
                <span className="activity-peer muted">pending</span>
                <span className="activity-poison" />
                <span className="activity-when">mining</span>
                {session ? (
                  <span className="row activity-stuck">
                    <button
                      type="button"
                      className="btn ghost gas-pill"
                      disabled={busy}
                      onClick={onSpeedUp}
                    >
                      {t("speedUpShort")}
                    </button>
                    <button
                      type="button"
                      className="btn ghost gas-pill"
                      disabled={busy}
                      onClick={onCancelStuck}
                    >
                      {t("cancelShort")}
                    </button>
                  </span>
                ) : null}
              </li>
            ) : null}
            {filtered.map((row) => {
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
              const peer = shortPeer(row.counterparty);
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
                    title={
                      row.summary
                        ? `${row.summary} · copy ${row.hash}`
                        : `Copy ${row.hash}`
                    }
                    onClick={() => {
                      void navigator.clipboard.writeText(row.hash);
                    }}
                  >
                    {dirLabel}
                  </button>
                  <span
                    className="activity-amt"
                    title={
                      row.summary ||
                      (row.asset || row.method
                        ? `${row.asset || row.method} · ${row.valueEth}`
                        : row.valueEth)
                    }
                  >
                    {parts ? (
                      <>
                        <span className="activity-int">{parts.int}</span>
                        <span className="activity-frac">
                          {parts.frac != null ? `.${parts.frac}` : ""}
                        </span>
                        {row.asset && row.asset !== "PLS" ? (
                          <span className="activity-asset"> {row.asset}</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="activity-int method">
                        {row.method || "—"}
                      </span>
                    )}
                  </span>
                  <span
                    className="activity-peer"
                    title={row.counterparty || undefined}
                  >
                    {peer || "—"}
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
            })}
          </ul>
        </>
      )}
      {active && actHasMore ? (
        <button
          ref={moreRef}
          type="button"
          className="btn ghost activity-more"
          disabled={actBusy}
          onClick={() => {
            const next = actLimit + 48;
            setActLimit(next);
            void refreshActivity(active.address, chainId, next);
          }}
        >
          {actBusy ? "…" : "More"}
        </button>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="bag-activity">{body}</div>;
  }
  return <section className="card activity">{body}</section>;
}
