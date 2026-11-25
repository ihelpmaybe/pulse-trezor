/**
 * Bag card — tokens / NFTs / activity / HEX stakes.
 */
import { formatEther, isAddress, type Address, type Hash } from "viem";
import type { BookEntry } from "../chain/addressBook";
import type { ActivityRow } from "../chain/activity";
import {
  explorerAddressUrl,
  explorerNftUrl,
  type DeskChainId,
  type RpcOverride,
} from "../chain/client";
import {
  addCustomToken,
  fetchCustomTokenMeta,
  removeCustomToken,
  type CustomToken,
} from "../chain/customTokens";
import { toggleFavorite } from "../chain/favorites";
import type { FullBag, ScanNft } from "../chain/portfolio";
import { formatUsdHint, type PriceHint } from "../chain/prices";
import type { PackToken } from "../chain/tokens";
import { t } from "../i18n/en";
import { ActivityPanel } from "./ActivityPanel";

export type BagTab = "tokens" | "nfts" | "activity" | "stakes";

type TokenRow = { token: PackToken; raw: bigint; formatted: string };
type SessionLike = { address: Address; derivationIndex: number };
type ActFilter = "all" | "in" | "out";
type TxStatus = "pending" | "confirmed" | "reverted" | "timeout" | null;

type Props = {
  active: SessionLike | null;
  chainId: DeskChainId;
  pack: { currency: { symbol: string } };
  bagTab: BagTab;
  setBagTab: (t: BagTab) => void;
  hexModule: boolean;
  acctHexStakes: Record<string, number>;
  balBusy: boolean;
  balance: bigint | null;
  tokenRows: TokenRow[];
  fullBag: FullBag | null;
  hideZeroBal: boolean;
  setHideZeroBal: (v: boolean) => void;
  favs: string[];
  setFavs: (v: string[]) => void;
  priceHints: PriceHint[];
  asset: "PLS" | string;
  setAsset: (v: "PLS" | string) => void;
  customRows: { token: CustomToken; raw: bigint; formatted: string }[];
  importAddr: string;
  setImportAddr: (v: string) => void;
  importBusy: boolean;
  setImportBusy: (v: boolean) => void;
  setErr: (v: string | null) => void;
  effectiveRpc: RpcOverride | undefined;
  refreshBalances: (address: Address, chainId: DeskChainId) => void | Promise<void>;
  bagBusy: boolean;
  onLoadFullBag: () => void;
  nfts: ScanNft[];
  nftsTruncated: number;
  nftBusy: boolean;
  nftErr: string | null;
  refreshNfts: (address: Address, chainId: DeskChainId) => void | Promise<void>;
  /** Activity tab (was standalone card). */
  session: boolean;
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

export function BagPanel({
  active,
  chainId,
  pack,
  bagTab,
  setBagTab,
  hexModule,
  acctHexStakes,
  balBusy,
  balance,
  tokenRows,
  fullBag,
  hideZeroBal,
  setHideZeroBal,
  favs,
  setFavs,
  priceHints,
  asset,
  setAsset,
  customRows,
  importAddr,
  setImportAddr,
  importBusy,
  setImportBusy,
  setErr,
  effectiveRpc,
  refreshBalances,
  bagBusy,
  onLoadFullBag,
  nfts,
  nftsTruncated,
  nftBusy,
  nftErr,
  refreshNfts,
  session,
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
  return (
            <section className="card bag-card">
              <div className="bag-head">
                <h2 title={active ? "Balances for this account" : undefined}>
                  {active ? `Slot #${active.derivationIndex}` : "Balances"}
                </h2>
                <div className="action-tabs bag-tabs" role="tablist" aria-label="Bag">
                  <button
                    type="button"
                    id="bag-tab-tokens"
                    role="tab"
                    aria-selected={bagTab === "tokens"}
                    aria-controls="bag-panel-tokens"
                    tabIndex={bagTab === "tokens" ? 0 : -1}
                    className={bagTab === "tokens" ? "tab on" : "tab"}
                    onClick={() => setBagTab("tokens")}
                  >
                    Tokens
                  </button>
                  <button
                    type="button"
                    id="bag-tab-nfts"
                    role="tab"
                    aria-selected={bagTab === "nfts"}
                    aria-controls="bag-panel-nfts"
                    tabIndex={bagTab === "nfts" ? 0 : -1}
                    className={bagTab === "nfts" ? "tab on" : "tab"}
                    onClick={() => setBagTab("nfts")}
                  >
                    NFTs
                  </button>
                  <button
                    type="button"
                    id="bag-tab-activity"
                    role="tab"
                    aria-selected={bagTab === "activity"}
                    aria-controls="bag-panel-activity"
                    tabIndex={bagTab === "activity" ? 0 : -1}
                    className={bagTab === "activity" ? "tab on" : "tab"}
                    onClick={() => setBagTab("activity")}
                  >
                    Activity
                  </button>
                  {hexModule && chainId === 369 ? (
                    <button
                      type="button"
                      id="bag-tab-stakes"
                      role="tab"
                      aria-selected={bagTab === "stakes"}
                      aria-controls="bag-panel-stakes"
                      tabIndex={bagTab === "stakes" ? 0 : -1}
                      className={bagTab === "stakes" ? "tab on" : "tab"}
                      onClick={() => setBagTab("stakes")}
                    >
                      Stakes
                      {(acctHexStakes[active?.address?.toLowerCase() ?? ""] ?? 0) >
                      0
                        ? ` · ${acctHexStakes[active!.address.toLowerCase()]}`
                        : ""}
                    </button>
                  ) : null}
                </div>
              </div>
    
              <div
                id="bag-panel-tokens"
                role="tabpanel"
                aria-labelledby="bag-tab-tokens"
                hidden={bagTab !== "tokens"}
              >
                {!active ? (
                  <p className="muted empty-teach">
                    Connect first (Allow in Suite), then balances land here.
                  </p>
                ) : (
                  <>
                    {balBusy ? (
                      <p className="bal">…</p>
                    ) : balance != null && balance > 0n ? (
                      <p className="bal">
                        {formatEther(balance)} {pack.currency.symbol}
                      </p>
                    ) : null}
                    {chainId === 369 && active && hexModule ? (
                      <p className="hex-strip muted fee" aria-label="HEX liquid vs staked">
                        {(() => {
                          const hexRow = tokenRows.find(
                            (r) =>
                              r.token.address.toLowerCase() ===
                              "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
                          );
                          const liquid = hexRow?.formatted ?? "—";
                          const stakedN =
                            fullBag?.stakeCount ??
                            acctHexStakes[active.address.toLowerCase()] ??
                            0;
                          const stakedHex =
                            fullBag?.stakes.reduce(
                              (n, s) => n + Number(s.formattedHex || 0),
                              0,
                            ) ?? null;
                          return (
                            <>
                              HEX liquid {liquid}
                              {" · "}
                              {stakedN > 0
                                ? stakedHex != null
                                  ? `staked ~${stakedHex.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${stakedN})`
                                  : `${stakedN} stake${stakedN === 1 ? "" : "s"}`
                                : "no stakes"}
                              {" · "}
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => setBagTab("stakes")}
                              >
                                Stakes
                              </button>
                            </>
                          );
                        })()}
                      </p>
                    ) : null}
                    {chainId === 369 &&
                    active &&
                    !hexModule &&
                    (acctHexStakes[active.address.toLowerCase()] ?? 0) > 0 ? (
                      <p className="muted fee">
                        This bag has HEX stakes — turn on{" "}
                        <strong>HEX stakes</strong> under Settings → Modules to
                        see them.
                      </p>
                    ) : null}
                    <label className="hide-zero">
                      <input
                        type="checkbox"
                        checked={hideZeroBal}
                        onChange={(e) => setHideZeroBal(e.target.checked)}
                      />
                      {t("hideZeros")}
                    </label>
                    {chainId === 369 ? (
                      <ul className="token-grid">
                        {[...tokenRows]
                          .filter((r) => !hideZeroBal || r.raw > 0n)
                          .sort((a, b) => {
                            const af = favs.includes(a.token.address.toLowerCase())
                              ? 0
                              : 1;
                            const bf = favs.includes(b.token.address.toLowerCase())
                              ? 0
                              : 1;
                            return af - bf;
                          })
                          .map((r) => {
                            const tags = r.token.tags ?? [];
                            const bridged = tags.includes("bridged");
                            const inherited = tags.includes("inherited");
                            const fav = favs.includes(
                              r.token.address.toLowerCase(),
                            );
                            return (
                              <li key={r.token.address}>
                                <button
                                  type="button"
                                  className={
                                    asset === r.token.address ? "tok on" : "tok"
                                  }
                                  onClick={() => setAsset(r.token.address)}
                                  title={r.token.name}
                                >
                                  <span>
                                    {r.token.symbol}
                                    {bridged ? (
                                      <span className="tok-tag ok"> bridged</span>
                                    ) : null}
                                    {inherited ? (
                                      <span className="tok-tag bad"> inherited</span>
                                    ) : null}
                                  </span>
                                  <span className="muted">
                                    {r.formatted}
                                    {(() => {
                                      const ph = priceHints.find(
                                        (p) =>
                                          p.address.toLowerCase() ===
                                          r.token.address.toLowerCase(),
                                      );
                                      const u = formatUsdHint(ph?.usd ?? null);
                                      return u ? ` · ${u}` : "";
                                    })()}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className={
                                    fav ? "btn ghost tok-forget on" : "btn ghost tok-forget"
                                  }
                                  aria-label={
                                    fav
                                      ? `Unfavorite ${r.token.symbol}`
                                      : `Favorite ${r.token.symbol}`
                                  }
                                  onClick={() =>
                                    setFavs(
                                      toggleFavorite(chainId, r.token.address),
                                    )
                                  }
                                >
                                  {fav ? "★" : "☆"}
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                    ) : null}
                    {customRows.length ? (
                      <ul className="token-grid">
                        {customRows
                          .filter((r) => !hideZeroBal || r.raw > 0n)
                          .map((r) => (
                          <li key={`c-${r.token.address}`}>
                            <button
                              type="button"
                              className={
                                asset.toLowerCase() ===
                                r.token.address.toLowerCase()
                                  ? "tok on"
                                  : "tok"
                              }
                              onClick={() => setAsset(r.token.address)}
                              title={r.token.name}
                            >
                              <span>{r.token.symbol}</span>
                              <span className="muted">{r.formatted}</span>
                            </button>
                            <button
                              type="button"
                              className="btn ghost tok-forget"
                              aria-label={`Remove ${r.token.symbol}`}
                              onClick={() => {
                                removeCustomToken(chainId, r.token.address);
                                if (
                                  asset.toLowerCase() ===
                                  r.token.address.toLowerCase()
                                ) {
                                  setAsset("PLS");
                                }
                                if (active) {
                                  void refreshBalances(active.address, chainId);
                                }
                              }}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {chainId === 943 && !customRows.length ? (
                      <p className="muted empty-teach">
                        Testnet has no pack tokens — Import a contract below, then
                        Send as ERC-20.
                      </p>
                    ) : null}
                    <details className="gas-details">
                      <summary>Import token</summary>
                      <label className="field">
                        Contract
                        <input
                          value={importAddr}
                          onChange={(e) => setImportAddr(e.target.value)}
                          placeholder="0x…"
                          spellCheck={false}
                          autoComplete="off"
                        />
                      </label>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={importBusy || !importAddr.trim()}
                        onClick={() => {
                          if (!isAddress(importAddr.trim())) {
                            setErr("Token address invalid.");
                            return;
                          }
                          setImportBusy(true);
                          setErr(null);
                          void fetchCustomTokenMeta(
                            chainId,
                            importAddr.trim() as Address,
                            effectiveRpc,
                          )
                            .then((meta) => {
                              addCustomToken({
                                chainId,
                                ...meta,
                              });
                              setImportAddr("");
                              setAsset(meta.address);
                              if (active) {
                                void refreshBalances(active.address, chainId);
                              }
                            })
                            .catch((e) => {
                              setErr(
                                e instanceof Error ? e.message : String(e),
                              );
                            })
                            .finally(() => setImportBusy(false));
                        }}
                      >
                        {importBusy ? "…" : "Add"}
                      </button>
                    </details>
                    <div className="row">
                      {chainId === 369 && asset !== "PLS" ? (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setAsset("PLS")}
                        >
                          Use PLS
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={balBusy}
                        onClick={() =>
                          void refreshBalances(active.address, chainId)
                        }
                      >
                        Refresh
                      </button>
                      {chainId === 369 || chainId === 943 ? (
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={bagBusy}
                          onClick={onLoadFullBag}
                        >
                          {bagBusy
                            ? "Loading bag…"
                            : fullBag
                              ? "Reload full bag"
                              : "Load full bag"}
                        </button>
                      ) : null}
                    </div>
                    {fullBag ? (
                      <div className="full-bag">
                        <p className="muted bag-sum">
                          Extra tokens {fullBag.tokens.length}
                          {fullBag.tokensTruncated ? "+" : ""} · HEX stakes{" "}
                          {fullBag.stakeCount}
                        </p>
                        {fullBag.tokens.filter(
                          (t) => !hideZeroBal || t.raw > 0n,
                        ).length ? (
                          <ul className="token-grid">
                            {fullBag.tokens
                              .filter((t) => !hideZeroBal || t.raw > 0n)
                              .map((t) => (
                              <li key={t.address}>
                                <button
                                  type="button"
                                  className={
                                    asset.toLowerCase() ===
                                    t.address.toLowerCase()
                                      ? "tok on"
                                      : "tok"
                                  }
                                  onClick={() => setAsset(t.address)}
                                  title={t.name}
                                >
                                  <span>{t.symbol}</span>
                                  <span className="muted">{t.formatted}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">
                            No extra ERC-20s (or all spam-filtered).
                          </p>
                        )}
                        {fullBag.stakeCount > 0 ? (
                          <p className="muted fee">
                            HEX stakes {fullBag.stakeCount} ·{" "}
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => setBagTab("stakes")}
                            >
                              Open Stakes
                            </button>
                          </p>
                        ) : (
                          <p className="muted">No HEX stakes.</p>
                        )}
                        <p className="muted">
                          <a
                            className="link"
                            href={explorerAddressUrl(chainId, active.address)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open full bag on PulseScan
                          </a>
                        </p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
    
              <div
                id="bag-panel-nfts"
                role="tabpanel"
                aria-labelledby="bag-tab-nfts"
                hidden={bagTab !== "nfts"}
              >
                {!active ? (
                  <p className="muted">Connect to load NFTs.</p>
                ) : (
                  <>
                    <div className="row nft-toolbar">
                      <p className="muted nft-status">
                        {nftBusy
                          ? "Loading…"
                          : nftErr
                            ? nftErr
                            : `${nfts.length}${nftsTruncated ? "+" : ""} on PulseScan`}
                      </p>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={nftBusy}
                        onClick={() => void refreshNfts(active.address, chainId)}
                      >
                        Refresh
                      </button>
                    </div>
                    {!nftBusy && !nftErr && !nfts.length ? (
                      <p className="muted empty-teach">
                        No NFTs on first PulseScan page — try Refresh, or check
                        Approvals → NFT operators if a marketplace still has
                        setApprovalForAll.
                      </p>
                    ) : null}
                    {nfts.length ? (
                      <ul className="nft-grid">
                        {nfts.map((n) => (
                          <li key={`${n.contract}-${n.tokenId}`}>
                            <a
                              className="nft-card"
                              href={explorerNftUrl(
                                chainId,
                                n.contract,
                                n.tokenId,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              title={`${n.collection} #${n.tokenId}`}
                            >
                              <span className="nft-type">{n.type || "NFT"}</span>
                              <span className="nft-col">{n.collection}</span>
                              <span className="nft-id">#{n.tokenId}</span>
                              <span className="muted nft-type">{n.type}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="muted">
                      <a
                        className="link"
                        href={explorerAddressUrl(chainId, active.address)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open bag on PulseScan
                      </a>
                    </p>
                  </>
                )}
              </div>
    
              <div
                id="bag-panel-activity"
                role="tabpanel"
                aria-labelledby="bag-tab-activity"
                hidden={bagTab !== "activity"}
              >
                <ActivityPanel
                  embedded
                  active={active}
                  session={session}
                  chainId={chainId}
                  activity={activity}
                  actBusy={actBusy}
                  actErr={actErr}
                  actFilter={actFilter}
                  setActFilter={setActFilter}
                  actLimit={actLimit}
                  setActLimit={setActLimit}
                  actHasMore={actHasMore}
                  refreshActivity={refreshActivity}
                  addressBook={addressBook}
                  lastTx={lastTx}
                  txStatus={txStatus}
                  busy={busy}
                  onSpeedUp={onSpeedUp}
                  onCancelStuck={onCancelStuck}
                />
              </div>

              <div
                id="bag-panel-stakes"
                role="tabpanel"
                aria-labelledby="bag-tab-stakes"
                hidden={!hexModule || bagTab !== "stakes"}
              >
                {!hexModule ? null : !active ? (
                  <p className="muted">Connect to load HEX stakes.</p>
                ) : chainId !== 369 ? (
                  <p className="muted">HEX stakes are mainnet (369) only.</p>
                ) : bagBusy && !fullBag ? (
                  <p className="muted">Loading stakes…</p>
                ) : (
                  <>
                    <p className="muted fee">
                      Clear-sign: Apps shows stakeStart hearts/days and stakeEnd
                      index/id. Confirm on Trezor — dApp labels can lie.{" "}
                      <a
                        className="link"
                        href="https://go.hex.com"
                        target="_blank"
                        rel="noreferrer"
                      >
                        go.hex.com
                      </a>
                    </p>
                    <div className="row">
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={bagBusy}
                        onClick={onLoadFullBag}
                      >
                        {bagBusy ? "Loading…" : "Reload stakes"}
                      </button>
                    </div>
                    {fullBag && fullBag.stakeCount > 0 ? (
                      <ul className="stake-grid">
                        {fullBag.stakes.map((s) => (
                          <li key={s.stakeId} className="stake-card">
                            <span className="stake-id">#{s.stakeId}</span>
                            <span className="stake-amt">
                              {s.formattedHex} HEX
                            </span>
                            <span className="muted">
                              {s.stakedDays}d
                              {s.unlockedDay > 0 ? " · ended" : " · locked"}
                            </span>
                          </li>
                        ))}
                        {fullBag.stakeCount > fullBag.stakes.length ? (
                          <li className="stake-card muted">
                            +{fullBag.stakeCount - fullBag.stakes.length} more
                            on-chain
                          </li>
                        ) : null}
                      </ul>
                    ) : (
                      <p className="muted empty-teach">
                        No HEX stakes on this account. Start / end stakes via{" "}
                        <a
                          className="link"
                          href="https://go.hex.com"
                          target="_blank"
                          rel="noreferrer"
                        >
                          go.hex.com
                        </a>{" "}
                        → Apps (WalletConnect).
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>

  );
}
