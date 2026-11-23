/**
 * Apps tab — ProveX, Bridge, companions, curated DeFi deeplinks.
 */
import deeplinks from "../pack/deeplinks.json";
import type { DeskChainId } from "../chain/client";
import type { PackToken } from "../chain/tokens";
import { BRIDGED_USDC, INHERITED_USDC } from "./swapFace";

type TokenRow = { token: PackToken; raw: bigint; formatted: string };

type ActionTab = "send" | "swap" | "sites" | "approve" | "apps";

type Props = {
  chainId: DeskChainId;
  active: boolean;
  tokenRows: TokenRow[];
  onActionTab: (tab: ActionTab) => void;
  onOpenCustomCall: () => void;
};

const DEFI_IDS = [
  "piteas",
  "liquid-loans",
  "phiat",
  "9mm",
  "phux",
  "liberty-swap",
] as const;

export function AppsPanel({
  chainId,
  active,
  tokenRows,
  onActionTab,
  onOpenCustomCall,
}: Props) {
  return (
    <div className="apps-grid">
      <div className="apps-card">
        <h3>Buy / sell $ (ProveX)</h3>
        <p className="muted fee">
          Fiat on/off-ramp via ProveX — not custody inside Perch. Use bridged
          USDC only — not the inherited fork copy.
        </p>
        {chainId === 369 && active ? (
          <p className="muted">
            Bridged USDC:{" "}
            {tokenRows.find(
              (r) =>
                r.token.address.toLowerCase() === BRIDGED_USDC.toLowerCase(),
            )?.formatted ?? "—"}
            {tokenRows.some(
              (r) =>
                r.token.address.toLowerCase() ===
                  INHERITED_USDC.toLowerCase() && r.raw > 0n,
            ) ? (
              <span className="tok-tag bad">
                {" "}
                inherited USDC also in bag — don’t treat as $1
              </span>
            ) : null}
          </p>
        ) : (
          <p className="muted empty-teach">
            Connect on Pulse mainnet to see bridged USDC.
          </p>
        )}
        <a
          className="btn ghost"
          href="https://app.provex.com"
          target="_blank"
          rel="noreferrer"
        >
          Open ProveX
        </a>
      </div>
      <div className="apps-card">
        <h3>Quick swap</h3>
        <p className="muted fee">
          In-desk PulseX V2 quote → sign on Trezor. For the full DEX UI, use
          Sites → PulseX.
        </p>
        <button
          type="button"
          className="btn ghost"
          disabled={chainId !== 369}
          onClick={() => onActionTab("swap")}
        >
          Open Swap
        </button>
      </div>
      <div className="apps-card">
        <h3>Custom contract call</h3>
        <p className="muted fee">
          Power tool — paste contract + calldata (hex), payable value from Send
          amount. Blind selectors need extra confirm.
        </p>
        <button type="button" className="btn ghost" onClick={onOpenCustomCall}>
          Open power tool
        </button>
      </div>
      <div className="apps-card">
        <h3>Pulse Bridge</h3>
        <p className="muted fee">
          Bridge in → then receive here. After Bridge, copy your Perch address
          (or QR) as the destination.
        </p>
        <a
          className="btn ghost"
          href="https://bridge.pulsechain.com"
          target="_blank"
          rel="noreferrer"
        >
          Open Bridge
        </a>
      </div>
      <div className="apps-card">
        <h3>Migrate from ETH</h3>
        <p className="muted fee">
          Same BIP44 path as Suite “Ethereum #1”. Connect the same Trezor
          account → Load full bag on Pulse → revoke old ETH allowances you don’t
          need.
        </p>
        <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onActionTab("approve")}
            disabled={chainId !== 369 && chainId !== 943}
          >
            Open Approvals
          </button>
          <a
            className="btn ghost"
            href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/migrate-from-eth.md"
            target="_blank"
            rel="noreferrer"
          >
            Migrate guide
          </a>
        </div>
      </div>
      <div className="apps-card">
        <h3>Advanced · claim / migrate</h3>
        <p className="muted fee">
          Power path: custom call for rescue/claim calldata, Approvals to clean
          spenders, Sites for HEX stakeEnd / claim UIs. Read every field on the
          Trezor — Perch does not auto-claim.
        </p>
        <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn ghost"
            onClick={onOpenCustomCall}
          >
            Custom call
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onActionTab("approve")}
          >
            Approvals
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onActionTab("sites")}
          >
            Sites
          </button>
        </div>
      </div>
      <div className="apps-card">
        <h3>ZKX Wallet</h3>
        <p className="muted fee">
          Soft + privacy (RAILGUN). Optional HW attach — shield is soft-only.
          HWW Pulse bag stays Perch + Trezor.
        </p>
        <a
          className="btn ghost"
          href="https://zkxwallet.com"
          target="_blank"
          rel="noreferrer"
        >
          Open ZKX
        </a>
      </div>
      <div className="apps-card">
        <h3>Internet Money</h3>
        <p className="muted fee">
          Soft Pulse mobile / Chrome. Not a Trezor path — use for phone daily,
          not serious HWW.
        </p>
        <a
          className="btn ghost"
          href="https://internetmoney.io"
          target="_blank"
          rel="noreferrer"
        >
          Open Internet Money
        </a>
      </div>
      <div className="apps-card">
        <h3>Tip (mobile soft)</h3>
        <p className="muted fee">
          Soft wallet companion for on-the-go. HWW stays Perch + Trezor.
        </p>
        <a
          className="btn ghost"
          href="https://github.com/ihelpmaybe/Tip-wallet"
          target="_blank"
          rel="noreferrer"
        >
          Tip wallet
        </a>
      </div>
      {deeplinks.defi
        .filter((d) => (DEFI_IDS as readonly string[]).includes(d.id))
        .map((d) => (
          <div className="apps-card" key={d.id}>
            <h3>{d.name}</h3>
            <p className="muted fee">
              {(d as { role?: string }).role || "Pulse DeFi"} · open via Sites
              (WalletConnect) for Trezor sign.
            </p>
            <a
              className="btn ghost"
              href={d.app}
              target="_blank"
              rel="noreferrer"
            >
              Open {d.name}
            </a>
          </div>
        ))}
    </div>
  );
}
