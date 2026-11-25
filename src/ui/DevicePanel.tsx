/**
 * Device card — network, load accounts, Connect, account grid.
 */
import {
  useEffect,
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from "react";
import type { Address } from "viem";
import {
  loadAccountMarks,
  setAccountMark,
  type AccountMark,
} from "../chain/accountMarks";
import {
  loadAccountNotes,
  setAccountNote,
} from "../chain/accountNotes";
import {
  addWalletFavorite,
  removeWalletFavorite,
} from "../chain/favorites";
import {
  ACCOUNT_INDEX_MAX,
  FACE_LOAD_SOFT_MAX,
  parseLoadSpec,
  shortAddr,
  shortNative,
} from "./faceFormat";
import { AccountMarkIcon } from "./AccountMarkIcon";
import { AccountMarkPicker } from "./AccountMarkPicker";
import { AccountNoteEditor } from "./AccountNoteEditor";
import {
  AccountNoteMenu,
  type AccountNoteMenuState,
} from "./AccountNoteMenu";
import { HexStakeMark } from "./HexStakeMark";
import {
  chainLabel,
  listSelectableChainIds,
  nativeSymbol,
  type DeskChainId,
} from "../chain/client";
import {
  addEvmByChainId,
  getCustomEvmPack,
  isEvmChainId,
  removeCustomEvmPack,
} from "../chain/evmNetworks";
import type { DeviceHints, ListedAccount, SuiteChannel } from "../trezor/connect";
import { ethAddressPath } from "../trezor/paths";
import {
  buildEthPathTemplate,
  CHANGE_MAX,
  PathModal,
  parseEthPathKnobs,
} from "./PathModal";
import type { BagTab } from "./BagPanel";
import {
  loadDeviceAdvanced,
  saveAccountRangeSpec,
  saveDeviceAdvanced,
} from "./deskStorage";
import { t } from "../i18n/en";
import { DeviceConnectFace } from "./DeviceConnectFace";

type SessionLike = {
  address: Address;
  derivationIndex: number;
} | null;

type Props = {
  showTestnet: boolean;
  chainId: DeskChainId;
  setChainId: (id: DeskChainId) => void;
  setAsset: (v: "PLS" | string) => void;
  setErr?: (v: string | null) => void;
  accountRange: string;
  setAccountRange: (s: string) => void;
  connecting: boolean;
  listing: boolean;
  busy: boolean;
  session: SessionLike;
  active: SessionLike;
  canSign: boolean;
  onLoadAccounts: (opts?: {
    gapTrim?: boolean;
    from?: number;
    to?: number;
  }) => void;
  onClearAccounts: () => void;
  onConnect: () => void;
  onAcquireDevice?: () => void;
  onCancelConnect: () => void;
  onCancelBusy: () => void;
  onDisconnect: () => void;
  accountIndex: number;
  setAccountIndex: (i: number) => void;
  suiteCue: string | null;
  suiteChannel: SuiteChannel;
  deviceHints: DeviceHints | null;
  accountList: ListedAccount[];
  acctPls: Record<string, bigint>;
  acctHexStakes: Record<string, number>;
  pathTemplate: string;
  applyPathTemplate: (template: string) => void;
  packSymbol: string;
  privacyHide: boolean;
  hexModule: boolean;
  selectListedAccount: (a: ListedAccount) => void;
  setBagTab: (t: BagTab) => void;
  walletFavs: string[];
  setWalletFavs: Dispatch<SetStateAction<string[]>>;
};

export function DevicePanel({
  showTestnet,
  chainId,
  setChainId,
  setAsset,
  setErr,
  accountRange,
  setAccountRange,
  connecting,
  listing,
  busy,
  session,
  active,
  canSign,
  onLoadAccounts,
  onClearAccounts,
  onConnect,
  onAcquireDevice,
  onCancelConnect,
  onCancelBusy,
  onDisconnect,
  accountIndex,
  setAccountIndex,
  suiteCue,
  suiteChannel,
  deviceHints,
  accountList,
  acctPls,
  acctHexStakes,
  packSymbol,
  privacyHide,
  hexModule,
  selectListedAccount,
  setBagTab,
  pathTemplate,
  applyPathTemplate,
  walletFavs,
  setWalletFavs,
}: Props) {
  const [advanced, setAdvanced] = useState(() => loadDeviceAdvanced());
  const [addChainId, setAddChainId] = useState("");
  const [addRpcUrl, setAddRpcUrl] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [, setNetTick] = useState(0);
  const [pathOpen, setPathOpen] = useState(false);
  const [marks, setMarks] = useState(() => loadAccountMarks());
  const [notes, setNotes] = useState(() => loadAccountNotes());
  const [markFor, setMarkFor] = useState<ListedAccount | null>(null);
  const [noteMenu, setNoteMenu] = useState<AccountNoteMenuState | null>(null);
  const [noteEdit, setNoteEdit] = useState<ListedAccount | null>(null);
  const pathPreview = ethAddressPath(accountIndex, pathTemplate);
  const pathKnobs = parseEthPathKnobs(pathTemplate);
  const [accountDraft, setAccountDraft] = useState(pathKnobs.account);
  const [rangeDraft, setRangeDraft] = useState(accountRange);
  useEffect(() => {
    setAccountDraft(pathKnobs.account);
  }, [pathKnobs.account]);
  useEffect(() => {
    setRangeDraft(accountRange);
  }, [accountRange]);
  const loadSpec = parseLoadSpec(rangeDraft) ?? parseLoadSpec(accountRange);
  const loadSpan = loadSpec?.span ?? 12;
  const loadFrom = loadSpec?.from ?? 0;
  const loadTooBig = loadSpan > FACE_LOAD_SOFT_MAX;
  const favSet = new Set(walletFavs.map((a) => a.toLowerCase()));

  function setBranch(nextAccount: number, nextChange: number) {
    applyPathTemplate(buildEthPathTemplate(nextAccount, nextChange));
  }

  function commitAccountDraft() {
    const a = Math.max(
      0,
      Math.min(ACCOUNT_INDEX_MAX, Math.floor(accountDraft)),
    );
    setAccountDraft(a);
    if (a !== pathKnobs.account) setBranch(a, pathKnobs.change);
  }

  function commitRangeDraft() {
    const p = parseLoadSpec(rangeDraft);
    if (!p) {
      setRangeDraft(accountRange);
      return;
    }
    const normalized = rangeDraft.trim().replace(/\s+/g, "");
    setRangeDraft(normalized);
    setAccountRange(normalized);
    saveAccountRangeSpec(normalized);
  }
  const sortedAccounts = [...accountList].sort((a, b) => {
    const ak = a.address.toLowerCase();
    const bk = b.address.toLowerCase();
    const af = favSet.has(ak) || marks[ak] || notes[ak] ? 0 : 1;
    const bf = favSet.has(bk) || marks[bk] || notes[bk] ? 0 : 1;
    if (af !== bf) return af - bf;
    return a.derivationIndex - b.derivationIndex;
  });

  function openNoteMenu(e: MouseEvent, a: ListedAccount) {
    e.preventDefault();
    e.stopPropagation();
    const key = a.address.toLowerCase();
    setNoteMenu({
      address: a.address,
      derivationIndex: a.derivationIndex,
      x: e.clientX,
      y: e.clientY,
      hasNote: !!(notes[key] && notes[key].trim()),
    });
  }

  return (
    <section className="card device">
      <div className="device-head">
        <h2>Device</h2>
        <label className="device-advanced-tick" title="Show Account', Change, Count, Path">
          <input
            type="checkbox"
            checked={advanced}
            onChange={(e) => {
              const on = e.target.checked;
              setAdvanced(on);
              saveDeviceAdvanced(on);
              if (!on) setPathOpen(false);
            }}
          />
          Advanced
        </label>
        {advanced ? (
          <button
            type="button"
            className="btn ghost device-path-btn"
            disabled={connecting}
            title={pathPreview}
            aria-haspopup="dialog"
            aria-expanded={pathOpen}
            onClick={() => setPathOpen(true)}
          >
            Path
          </button>
        ) : null}
      </div>
      {advanced ? (
        <PathModal
          open={pathOpen}
          onClose={() => setPathOpen(false)}
          connecting={connecting}
          accountIndex={accountIndex}
          setAccountIndex={setAccountIndex}
          pathTemplate={pathTemplate}
          applyPathTemplate={applyPathTemplate}
          onLoadOne={(index) => onLoadAccounts({ from: index, to: index })}
        />
      ) : null}
      <div className="network-pick">
        <label className="field">
          Network
          <select
            value={chainId}
            onChange={(e) => {
              const id = Number(e.target.value) as DeskChainId;
              setChainId(id);
              try {
                setAsset(nativeSymbol(id));
              } catch {
                setAsset("PLS");
              }
            }}
          >
            {listSelectableChainIds().map((id) => (
              <option key={id} value={id}>
                {chainLabel(id)} ({id})
              </option>
            ))}
          </select>
        </label>
        <details className="gas-details" open={showTestnet || undefined}>
          <summary>Add EVM by chain ID</summary>
          <p className="muted fee">
            Any EVM — resolves public RPCs from Chainlist (ethereum-lists).
            Paste your own RPC if the list is empty or gated.
          </p>
          <label className="field">
            Chain ID
            <input
              value={addChainId}
              onChange={(e) => setAddChainId(e.target.value.trim())}
              placeholder="e.g. 8453"
              inputMode="numeric"
              spellCheck={false}
            />
          </label>
          <label className="field">
            RPC URL (optional)
            <input
              value={addRpcUrl}
              onChange={(e) => setAddRpcUrl(e.target.value.trim())}
              placeholder="https://…"
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className="btn ghost"
            disabled={addBusy || !addChainId}
            onClick={() => {
              const id = Number(addChainId);
              if (!isEvmChainId(id)) {
                setErr?.("Chain ID must be a positive integer.");
                return;
              }
              setAddBusy(true);
              setErr?.(null);
              void addEvmByChainId({
                chainId: id,
                rpcUrl: addRpcUrl || undefined,
              })
                .then((pack) => {
                  setChainId(pack.chainId);
                  setAsset(pack.currency.symbol);
                  setAddChainId("");
                  setAddRpcUrl("");
                  setNetTick((n) => n + 1);
                })
                .catch((e) => {
                  setErr?.(e instanceof Error ? e.message : String(e));
                })
                .finally(() => setAddBusy(false));
            }}
          >
            {addBusy ? "Resolving…" : "Add & switch"}
          </button>
          {getCustomEvmPack(chainId) ? (
            <button
              type="button"
              className="btn ghost"
              title="Remove this custom network"
              onClick={() => {
                removeCustomEvmPack(chainId);
                setChainId(369);
                setAsset("PLS");
                setNetTick((n) => n + 1);
              }}
            >
              Remove custom
            </button>
          ) : null}
        </details>
      </div>

      {advanced ? (
        <>
          <div
            className="device-branch-row"
            role="group"
            aria-label="Account', change, and load count"
          >
            <label className="field device-account-field">
              Account'
              <input
                type="number"
                min={0}
                max={ACCOUNT_INDEX_MAX}
                step={1}
                value={accountDraft}
                disabled={connecting}
                title="BIP44 account' — bulk Load uses this branch (Ledger Live bumps this)"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setAccountDraft(
                    Math.max(0, Math.min(ACCOUNT_INDEX_MAX, Math.floor(n))),
                  );
                }}
                onBlur={commitAccountDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitAccountDraft();
                  }
                }}
              />
            </label>
            <label className="field device-change-field">
              Change
              <select
                value={pathKnobs.change}
                disabled={connecting}
                title="BIP44 change — 0 or 1"
                onChange={(e) => {
                  const c = Math.max(
                    0,
                    Math.min(CHANGE_MAX, Math.floor(Number(e.target.value) || 0)),
                  );
                  setBranch(pathKnobs.account, c);
                }}
              >
                {Array.from({ length: CHANGE_MAX + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <code
            className="device-path-preview"
            title="First wallet Load will pull under this branch"
          >
            {ethAddressPath(loadFrom, pathTemplate)}
          </code>
        </>
      ) : null}
      <div className="device-count-face" role="group" aria-label="Load count">
        <label className="field device-range-field">
          Count
          <input
            type="text"
            inputMode="numeric"
            value={rangeDraft}
            disabled={connecting}
            placeholder="12 or 0-20"
            title="How many (12) or slot range (0-20). Keep ≤200 for one-click Load."
            onChange={(e) => setRangeDraft(e.target.value)}
            onBlur={commitRangeDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRangeDraft();
              }
            }}
          />
        </label>
      </div>
      <div className="row" style={{ marginTop: 0 }}>
        <button
          type="button"
          className="btn"
          disabled={connecting || !loadSpec || loadTooBig}
          title={
            loadTooBig
              ? `Count ${loadSpan} is too big for one click (max ${FACE_LOAD_SOFT_MAX}). Lower Count above.`
              : accountList.length
                ? advanced
                  ? `Add / reload ${loadSpan} addresses under …/${pathKnobs.account}'/${pathKnobs.change}/N (${loadFrom}–${loadSpec?.to ?? loadFrom}) — Rabby-style “add more from Trezor”`
                  : `Add / reload ${loadSpan} addresses — edit Count above`
                : advanced
                  ? `Load ${loadSpan} wallets under …/${pathKnobs.account}'/${pathKnobs.change}/N (${loadFrom}–${loadSpec?.to ?? loadFrom})`
                  : `Load ${loadSpan} wallets — Count field above`
          }
          onClick={() => {
            const p = parseLoadSpec(rangeDraft);
            if (!p || p.span > FACE_LOAD_SOFT_MAX) return;
            const normalized = rangeDraft.trim().replace(/\s+/g, "");
            setRangeDraft(normalized);
            setAccountRange(normalized);
            saveAccountRangeSpec(normalized);
            onLoadAccounts({ from: p.from, to: p.to });
          }}
        >
          {listing
            ? "Loading…"
            : loadTooBig
              ? `Lower Count (max ${FACE_LOAD_SOFT_MAX})`
              : accountList.length
                ? `Add more addresses (${loadSpan})`
                : `Load ${loadSpan} address${loadSpan === 1 ? "" : "es"}`}
        </button>
        {advanced ? (
          <button
            type="button"
            className="btn ghost"
            disabled={connecting}
            title="Pull at least 24 addresses, keep through last with PLS + one spare"
            onClick={() => onLoadAccounts({ gapTrim: true })}
          >
            {listing ? "…" : "Discover used"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn ghost"
          disabled={connecting || (!accountList.length && !session)}
          title="Clear loaded accounts"
          onClick={onClearAccounts}
        >
          Clear
        </button>
        {!session ? (
          <button
            type="button"
            className="btn"
            disabled={connecting}
            title={
              suiteChannel === "desktop"
                ? "Suite is up — Allow Pulse Perch, then confirm on the device"
                : "Plug in + unlock in Suite, then start (Suite Web works if Desktop is closed)"
            }
            onClick={onConnect}
          >
            {connecting && !listing
              ? t("waitingOnSuite")
              : advanced
                ? `${t("startConnection")} …/${accountIndex}`
                : t("startConnection")}
          </button>
        ) : null}
        {connecting || busy ? (
          <button
            type="button"
            className="btn ghost"
            title={t("stopWaitingTitle")}
            onClick={connecting ? onCancelConnect : onCancelBusy}
          >
            {t("stopWaiting")}
          </button>
        ) : null}
      </div>
      <DeviceConnectFace
        suiteChannel={suiteChannel}
        connecting={connecting}
        listing={listing}
        hasSession={!!active}
        canSign={canSign}
        accountCount={accountList.length}
        deviceHints={deviceHints}
        suiteCue={suiteCue}
        showChecklist={!active || connecting}
        onAcquireDevice={onAcquireDevice}
        acquireBusy={busy && !connecting}
      />
      {deviceHints?.passphraseProtection ? (
        <p className="muted fee" role="status">
          Passphrase / hidden wallet is on this device — the account you unlock
          in Suite is the one Perch will use.
        </p>
      ) : null}
      {busy && !connecting ? (
        <p className="muted" role="status">
          Signing — confirm in Trezor Suite / on device (may be on another
          screen). Fee on Pulse testnet can look huge; that&apos;s the network,
          not Perch.
        </p>
      ) : null}

      {sortedAccounts.length > 0 ? (
        <div className="acct-grid" role="list">
          {sortedAccounts.map((a) => {
            const key = a.address.toLowerCase();
            const on = active?.address?.toLowerCase() === key;
            const fav = favSet.has(key);
            const mark = marks[key] ?? null;
            const note = notes[key]?.trim() || "";
            const wei = on ? acctPls[key] : undefined;
            const hexN = on ? (acctHexStakes[key] ?? 0) : 0;
            const balText = !on
              ? ""
              : wei != null
                ? `${shortNative(wei)} ${packSymbol}`
                : "…";
            const tip = [a.derivationPath, note ? `Note: ${note}` : ""]
              .filter(Boolean)
              .join("\n");
            return (
              <div
                key={a.derivationIndex}
                role="listitem"
                className={
                  on
                    ? note
                      ? "acct-card on has-note"
                      : "acct-card on"
                    : note
                      ? "acct-card has-note"
                      : "acct-card"
                }
                onContextMenu={(e) => openNoteMenu(e, a)}
              >
                <button
                  type="button"
                  className="acct-card-main"
                  onClick={() => selectListedAccount(a)}
                  onContextMenu={(e) => openNoteMenu(e, a)}
                  title={tip}
                  aria-label={
                    privacyHide
                      ? `Slot ${a.derivationIndex}${on ? ", selected" : ""}, values hidden`
                      : `Slot ${a.derivationIndex}, ${a.address}${
                          balText ? `, ${balText}` : ""
                        }${
                          hexModule && hexN > 0 ? `, ${hexN} HEX stakes` : ""
                        }${note ? ", has note" : ""}${
                          fav || mark ? ", marked" : ""
                        }${on ? ", selected" : ""}`
                  }
                  aria-current={on ? "true" : undefined}
                >
                  <span className="acct-label">#{a.derivationIndex}</span>
                  <code className="acct-addr">{shortAddr(a.address)}</code>
                  {note ? (
                    <span className="acct-note-dot" title={note} aria-hidden="true" />
                  ) : null}
                  {on ? <span className="acct-bal">{balText}</span> : null}
                </button>
                <button
                  type="button"
                  className={mark || fav ? "acct-fav on" : "acct-fav"}
                  aria-label={`Choose mark for slot ${a.derivationIndex}`}
                  title="Shape & color"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMarkFor(a);
                  }}
                >
                  {mark ? <AccountMarkIcon mark={mark} size={12} /> : fav ? "★" : "☆"}
                </button>
                {hexModule && hexN > 0 ? (
                  <HexStakeMark
                    count={hexN}
                    onOpen={() => {
                      selectListedAccount(a);
                      setBagTab("stakes");
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {markFor ? (
        <AccountMarkPicker
          accountLabel={`#${markFor.derivationIndex}`}
          current={marks[markFor.address.toLowerCase()] ?? null}
          onPick={(mark: AccountMark) => {
            setMarks(setAccountMark(markFor.address, mark));
            setWalletFavs(addWalletFavorite(markFor.address));
            setMarkFor(null);
          }}
          onClear={() => {
            setMarks(setAccountMark(markFor.address, null));
            setWalletFavs(removeWalletFavorite(markFor.address));
            setMarkFor(null);
          }}
          onClose={() => setMarkFor(null)}
        />
      ) : null}
      {noteMenu ? (
        <AccountNoteMenu
          menu={noteMenu}
          onAddOrEdit={() => {
            const hit =
              accountList.find(
                (a) =>
                  a.address.toLowerCase() === noteMenu.address.toLowerCase(),
              ) ?? null;
            setNoteMenu(null);
            if (hit) setNoteEdit(hit);
          }}
          onClear={() => {
            setNotes(setAccountNote(noteMenu.address, null));
            setNoteMenu(null);
          }}
          onCopyAddress={() => {
            void navigator.clipboard.writeText(noteMenu.address);
            setNoteMenu(null);
          }}
          onClose={() => setNoteMenu(null)}
        />
      ) : null}
      {noteEdit ? (
        <AccountNoteEditor
          accountLabel={`#${noteEdit.derivationIndex}`}
          initial={notes[noteEdit.address.toLowerCase()] ?? ""}
          onSave={(text) => {
            setNotes(setAccountNote(noteEdit.address, text));
            setNoteEdit(null);
          }}
          onClose={() => setNoteEdit(null)}
        />
      ) : null}
      {active ? (
        <div className="session">
          {!canSign ? (
            <p className="muted">
              Watching — click Connect, then green Confirm in Suite (check other
              screens).
            </p>
          ) : null}
          {canSign ? (
            <div className="row">
              <button
                type="button"
                className="btn ghost"
                onClick={onDisconnect}
              >
                {t("disconnect")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
