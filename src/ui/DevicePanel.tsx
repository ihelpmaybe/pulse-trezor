/**
 * Device card — network, load accounts, Connect, account grid.
 */
import type { Address } from "viem";
import {
  ACCOUNT_COUNT_MAX,
  ACCOUNT_COUNT_MIN,
  clampAccountCount,
  shortAddr,
  shortNative,
} from "./faceFormat";
import { HexStakeMark } from "./HexStakeMark";
import {
  DESK_CHAIN_IDS,
  chainLabel,
  type DeskChainId,
} from "../chain/client";
import type { DeviceHints, ListedAccount, SuiteChannel } from "../trezor/connect";
import { saveAccountCount } from "./deskStorage";

type SessionLike = {
  address: Address;
  derivationIndex: number;
} | null;

type Props = {
  showTestnet: boolean;
  chainId: DeskChainId;
  setChainId: (id: DeskChainId) => void;
  setAsset: (v: "PLS" | string) => void;
  accountCount: number;
  setAccountCount: (n: number) => void;
  connecting: boolean;
  listing: boolean;
  busy: boolean;
  session: SessionLike;
  active: SessionLike;
  canSign: boolean;
  onLoadAccounts: () => void;
  onConnect: () => void;
  onCancelConnect: () => void;
  onCancelBusy: () => void;
  onDisconnect: () => void;
  accountIndex: number;
  suiteCue: string | null;
  suiteChannel: SuiteChannel;
  deviceHints: DeviceHints | null;
  accountList: ListedAccount[];
  acctPls: Record<string, bigint>;
  acctHexStakes: Record<string, number>;
  packSymbol: string;
  privacyHide: boolean;
  hexModule: boolean;
  selectListedAccount: (a: ListedAccount) => void;
  setBagTab: (t: "tokens" | "nfts" | "stakes") => void;
};

export function DevicePanel({
  showTestnet,
  chainId,
  setChainId,
  setAsset,
  accountCount,
  setAccountCount,
  connecting,
  listing,
  busy,
  session,
  active,
  canSign,
  onLoadAccounts,
  onConnect,
  onCancelConnect,
  onCancelBusy,
  onDisconnect,
  accountIndex,
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
}: Props) {
  return (
    <section className="card device">
      <div className="device-head">
        <h2>Device</h2>
      </div>
      {showTestnet ? (
        <label className="field">
          Network
          <select
            value={chainId}
            onChange={(e) => {
              setChainId(Number(e.target.value) as DeskChainId);
              setAsset("PLS");
            }}
          >
            {DESK_CHAIN_IDS.map((id) => (
              <option key={id} value={id}>
                {chainLabel(id)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="field">
        How many addresses?
        <input
          type="number"
          min={ACCOUNT_COUNT_MIN}
          max={ACCOUNT_COUNT_MAX}
          step={1}
          value={accountCount}
          disabled={connecting}
          onChange={(e) => {
            const n = clampAccountCount(Number(e.target.value));
            setAccountCount(n);
            saveAccountCount(n);
          }}
        />
      </label>
      <div className="row" style={{ marginTop: 0 }}>
        <button
          type="button"
          className="btn"
          disabled={connecting}
          onClick={onLoadAccounts}
        >
          {listing ? "Loading…" : `Load ${accountCount} accounts`}
        </button>
        {!session ? (
          <button
            type="button"
            className="btn ghost"
            disabled={connecting}
            onClick={onConnect}
          >
            {connecting && !listing
              ? "Connecting…"
              : `Connect #${accountIndex + 1} only`}
          </button>
        ) : null}
        {connecting || busy ? (
          <button
            type="button"
            className="btn ghost"
            onClick={connecting ? onCancelConnect : onCancelBusy}
          >
            Cancel
          </button>
        ) : null}
      </div>
      {connecting && suiteCue ? (
        <p className="muted" role="status">
          {suiteCue}
        </p>
      ) : null}
      {!active ? (
        <p className="muted empty-teach">
          First run: open Trezor Suite (
          {suiteChannel === "desktop"
            ? "Desktop detected"
            : "Desktop not seen — Suite Web / Desktop both work with Connect 10"}
          ) → Connect → Allow in Suite (other screen OK) → confirm address on
          device → Load full bag → Sites or the lab Chrome extension for dApps.
          Stuck? hit Cancel, then Connect again.
        </p>
      ) : null}
      {deviceHints?.outdated ? (
        <p className="warn-line" role="status">
          Firmware {deviceHints.firmware ?? "?"} looks outdated — update in Suite
          before big moves.
        </p>
      ) : null}
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

      {accountList.length > 0 ? (
        <div className="acct-grid" role="list">
          {accountList.map((a) => {
            const key = a.address.toLowerCase();
            const on = active?.address?.toLowerCase() === key;
            const wei = acctPls[key];
            const hexN = acctHexStakes[key] ?? 0;
            const balText =
              wei != null ? `${shortNative(wei)} ${packSymbol}` : "…";
            return (
              <button
                key={a.derivationIndex}
                type="button"
                role="listitem"
                className={on ? "acct-card on" : "acct-card"}
                onClick={() => selectListedAccount(a)}
                title={a.derivationPath}
                aria-label={
                  privacyHide
                    ? `Account #${a.derivationIndex + 1}${on ? ", selected" : ""}, values hidden`
                    : `Account #${a.derivationIndex + 1}, ${a.address}, ${balText}${
                        hexModule && hexN > 0 ? `, ${hexN} HEX stakes` : ""
                      }${on ? ", selected" : ""}`
                }
                aria-current={on ? "true" : undefined}
              >
                <span className="acct-label">#{a.derivationIndex + 1}</span>
                <code className="acct-addr">{shortAddr(a.address)}</code>
                <span className="acct-bal">{balText}</span>
                {hexModule && hexN > 0 ? (
                  <HexStakeMark
                    count={hexN}
                    onOpen={() => {
                      selectListedAccount(a);
                      setBagTab("stakes");
                    }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
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
                Disconnect
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
