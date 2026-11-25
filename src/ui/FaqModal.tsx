/**
 * Desk FAQ — how to use Perch, honest limits, vibe-coded note.
 */
import { useEffect, useRef } from "react";
import { trapTabKey } from "../a11y/focusTrap";

export type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "What is Pulse Perch?",
    a: "A PulseChain wallet face for a real Trezor. Suite talks to the device; Perch shows your bag, send, approve, swap, and Apps (WalletConnect) — without MetaMask.",
  },
  {
    q: "Was this vibe coded?",
    a: "Yes. Built fast with AI pair-programming, then smoke-tested on device/testnet. Expect rough edges. Read the Trezor screen — the browser can lie; the device cannot.",
  },
  {
    q: "How do I start? (first time)",
    a: "1) Connect — Start connection, Allow in Suite (other screen / taskbar OK), unlock on device. 2) Bag — balances show after you’re linked. 3) Apps — pair a site when you need a dapp (WalletConnect). Stuck waiting? Stop waiting, bring Suite forward, start again. Guides: github.com/ihelpmaybe/pulse-trezor-guides.",
  },
  {
    q: "I clicked Connect but nothing happens?",
    a: "The Allow prompt is in Trezor Suite, not in Perch. Check the other monitor and the Windows taskbar for “Trezor Suite”. Perch cannot click Allow for you. Stop waiting if it’s stuck, then try again.",
  },
  {
    q: "Do I need MetaMask?",
    a: "No. That’s the point. Keep Suite open for Connect. For dApps, use Apps (WalletConnect) or the lab Chrome extension while the Perch tab stays open.",
  },
  {
    q: "Is this official Trezor Pulse support?",
    a: "No. Suite still doesn’t list Pulse as a first-class network. Perch is a community path: your keys stay on the Trezor; Perch is the Pulse UI.",
  },
  {
    q: "Why can’t I send PLS to the HEX address?",
    a: "Plain sends to the HEX contract (and some other token contracts) lock funds forever. Stake via the HEX app / Stakes module — never paste the HEX contract as a normal recipient.",
  },
  {
    q: "What is Apps?",
    a: "WalletConnect. Paste a free Reown Cloud project id once, then paste a wc: URI from PulseX / HEX / ProveX / etc. Approve the session, then confirm each sign on the Trezor. Use Kill all sessions if something feels wrong.",
  },
  {
    q: "What does Verify mean on a pair request?",
    a: "Reown’s domain check: match, cannot verify, mismatch, or security risk. Mismatch / threat need an extra checkbox. Small Pulse apps often show “cannot verify” — still check the URL yourself.",
  },
  {
    q: "Speed up / Cancel stuck — what’s that?",
    a: "If a tx sits pending: Speed up resends the same job with a higher tip; Cancel replaces the nonce with a 0-value self-send so the queue clears. Confirm on the device either way. Device mempool replace is proven on Pulse testnet 943 — use wei-scale dust tips if you want the stuck row to last long enough to Speed up.",
  },
  {
    q: "Where’s the anime mascot?",
    a: "Off by default. Settings → Face → Show mascot.",
  },
  {
    q: "HEX stakes?",
    a: "Optional. Settings → Face → HEX stakes for the Stakes tab. Liquid HEX still shows under Tokens. Start/end via go.hex.com → Apps; trust clear-sign + device, not site chrome.",
  },
  {
    q: "Buy / sell dollars?",
    a: "Perch doesn’t custody fiat. Open ProveX in the browser and connect via Apps (WalletConnect). Use bridged USDC only — not the inherited fork copy.",
  },
  {
    q: "Custom contract call?",
    a: "Power tool under Send. Paste contract + calldata. Blind selectors need extra confirm. For rescue / advanced flows — not daily sends.",
  },
  {
    q: "Is my seed ever in this app?",
    a: "No. Perch never asks for a seed or private key. Signs go Suite → Trezor. Fake “Trezor update / connect” websites that ask for a seed are scams — close them.",
  },
  {
    q: "Do you track me / phone home?",
    a: "No analytics and no Perch accounts. Prefs stay in this browser. Opt-in “local first-send count” in Settings is a counter on this PC only — off by default. Normal wallet calls still hit your RPC, PulseScan, DexScreener (soft USD), Chainlist when you add a network, and Reown only after you paste a project id. Full list: PRIVACY.md on the repo.",
  },
  {
    q: "How do you protect users?",
    a: "Hardware path only. Clear-sign for Permit / unlimited approve / blind calldata. WalletConnect Verify + Kill all sessions. First mainnet send needs an extra ack. Device screen wins over site chrome. Report issues on GitHub — never trust random DMs offering recovery.",
  },
  {
    q: "Testnet vs mainnet?",
    a: "Default is PulseChain mainnet (369). Switch to testnet V4 (943) only for practice. First mainnet send asks for an extra ack. Fee quotes on testnets can look wild — that’s the network, not your bag.",
  },
  {
    q: "Other EVM networks (Base, Arbitrum, …)?",
    a: "Chainlist magic: Settings → Injected provider on, open chainlist.org in this tab (or via the MV3 extension), click Add — Perch confirms, pulls public RPCs from ethereum-lists when possible, then switches. Or Settings → Networks / Device → Add EVM and paste the chain ID.",
  },
  {
    q: "Chrome extension?",
    a: "Optional lab inject — Load unpacked from the extension folder / release zip, keep Perch + Suite up (cold desk does not fake accounts). Prefer Apps (WalletConnect) when the dapp supports it. Store listing is not the product goal.",
  },
  {
    q: "Install as an app?",
    a: "Easiest: open the live desk (GitHub Pages link in INSTALL.md) and use Chrome/Edge Install when offered. Or download the Windows zip from Releases and double-click Open-Pulse-Perch.cmd. Suite still required to sign. Settings only shows Install when the browser offers it.",
  },
  {
    q: "Something looks phishing-y — what do I do?",
    a: "Reject the session, Kill all sessions, and don’t sign. Read spender / amount / deadline on the Trezor. When in doubt, walk away — funds lost to a bad signature don’t come back.",
  },
  {
    q: "Who maintains this / support?",
    a: "Community project under ihelpmaybe on GitHub. No official Trezor support line for Perch. File issues on the repo; don’t trust random DMs offering “help.”",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FaqModal({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        trapTabKey(e, panelRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="rpc-modal-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rpc-modal faq-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Frequently asked questions"
        ref={panelRef}
      >
        <div className="rpc-modal-head">
          <h3>FAQ</h3>
          <button
            type="button"
            className="btn ghost rpc-modal-close"
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="muted fee faq-lede">
          How to use Pulse Perch · honest limits · yes, this was vibe coded.
        </p>
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
