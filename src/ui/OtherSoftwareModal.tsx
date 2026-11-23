/**
 * Official Pulse sites + Suite · Community = ihelpmaybe projects.
 * Compact logo / monogram tiles (no gray ghost dump).
 */
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { trapTabKey } from "../a11y/focusTrap";
import { explorerAddressUrl } from "../chain/client";
import deeplinks from "../pack/deeplinks.json";
import { FOOTER_CORE_IDS } from "./CoreFooter";

type Tone = "pulse" | "violet" | "green" | "amber" | "sky" | "rose" | "ink";

type CommunityItem = {
  name: string;
  /** Short face line under the mark. */
  tag: string;
  href: string;
  /** Monogram when no iconSrc. */
  mark: string;
  tone: Tone;
  iconSrc?: string;
  /** Favicon domain when using live mark (Suite). */
  domain?: string;
};

const COMMUNITY: CommunityItem[] = [
  {
    name: "Pulse Perch",
    tag: "This desk · Trezor HWW",
    href: "https://github.com/ihelpmaybe/pulse-trezor",
    mark: "PP",
    tone: "pulse",
    iconSrc: "/perch-icon.svg",
  },
  {
    name: "Tip wallet",
    tag: "Android · EIP-681 Pulse",
    href: "https://github.com/ihelpmaybe/Tip-wallet",
    mark: "Tip",
    tone: "violet",
    iconSrc: "/sw-brands/tip-wallet.svg",
  },
  {
    name: "Hearts Archive",
    tag: "On-chain Pulse newspaper",
    href: "https://ihelpmaybe.github.io/hearts-archive/",
    mark: "♥",
    tone: "rose",
    iconSrc: "/sw-brands/hearts-archive-ha.jpg",
  },
  {
    name: "Just The Tip",
    tag: "0% Tip-to-Buzz · Pulse",
    href: "https://github.com/ihelpmaybe/Just-The-Tip",
    mark: "JT",
    tone: "amber",
    iconSrc: "/sw-brands/just-the-tip.png",
  },
  {
    name: "Free Super chat",
    tag: "0% Super Chat software",
    href: "https://github.com/ihelpmaybe/Free-Super-chat",
    mark: "SC",
    tone: "sky",
  },
  {
    name: "SellHEX",
    tag: "HEX sell tooling",
    href: "https://github.com/ihelpmaybe/SellHEX",
    mark: "SX",
    tone: "green",
  },
  {
    name: "HEX Watch",
    tag: "Stake watcher",
    href: "https://github.com/ihelpmaybe/HEX-watch",
    mark: "HW",
    tone: "ink",
    iconSrc: "/sw-brands/hex-watch.svg",
  },
];

const CORE_DOMAIN: Record<(typeof FOOTER_CORE_IDS)[number], string> = {
  pulsechain: "pulsechain.com",
  hex: "hex.com",
  pulsex: "pulsex.com",
  provex: "provex.com",
  bridge: "bridge.pulsechain.com",
  "pump-tires": "pump.tires",
  scan: "scan.pulsechain.com",
};

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

type Tab = "official" | "community";

type Props = {
  open: boolean;
  onClose: () => void;
  activeAddress?: Address | null;
};

function FavMark({ domain, name }: { domain: string; name: string }) {
  const [ok, setOk] = useState(true);
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="sw-mark" aria-hidden="true">
      {ok ? (
        <img
          src={faviconUrl(domain)}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
        />
      ) : (
        <span className="sw-mark-fallback">{letter}</span>
      )}
    </span>
  );
}

function CommunityMark({ item }: { item: CommunityItem }) {
  const [ok, setOk] = useState(true);
  if (item.iconSrc && ok) {
    return (
      <span className={`sw-mark tone-${item.tone}`} aria-hidden="true">
        <img
          src={item.iconSrc}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
        />
      </span>
    );
  }
  return (
    <span className={`sw-mark sw-mono tone-${item.tone}`} aria-hidden="true">
      {item.mark}
    </span>
  );
}

export function OtherSoftwareModal({ open, onClose, activeAddress }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [tab, setTab] = useState<Tab>("official");

  useEffect(() => {
    if (!open) return;
    setTab("official");
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

  const core = FOOTER_CORE_IDS.map((id) => {
    const item = deeplinks.core.find((c) => c.id === id);
    if (!item) return null;
    const href =
      id === "scan" && activeAddress
        ? explorerAddressUrl(369, activeAddress)
        : item.app || item.url;
    if (!href) return null;
    return {
      id,
      name: item.name,
      href,
      domain: CORE_DOMAIN[id],
    };
  }).filter(Boolean) as {
    id: string;
    name: string;
    href: string;
    domain: string;
  }[];

  return (
    <div
      className="rpc-modal-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rpc-modal other-software-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Other software"
        ref={panelRef}
      >
        <div className="rpc-modal-head">
          <h3>Other software</h3>
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

        <div
          className="other-software-tabs"
          role="tablist"
          aria-label="Software category"
        >
          <button
            type="button"
            role="tab"
            id="sw-tab-official"
            aria-selected={tab === "official"}
            aria-controls="sw-panel-official"
            className={tab === "official" ? "sw-tab on" : "sw-tab"}
            onClick={() => setTab("official")}
          >
            Official
          </button>
          <button
            type="button"
            role="tab"
            id="sw-tab-community"
            aria-selected={tab === "community"}
            aria-controls="sw-panel-community"
            className={tab === "community" ? "sw-tab on" : "sw-tab"}
            onClick={() => setTab("community")}
          >
            Community
          </button>
        </div>

        {tab === "official" ? (
          <div
            id="sw-panel-official"
            role="tabpanel"
            aria-labelledby="sw-tab-official"
          >
            <p className="muted fee faq-lede">
              Pulse ecosystem + Suite host. Sign here when a dapp needs Trezor.
            </p>
            <ul className="sw-tile-grid">
              {core.map((item) => (
                <li key={item.id}>
                  <a
                    className="sw-tile"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    title={item.name}
                  >
                    <FavMark domain={item.domain} name={item.name} />
                    <span className="sw-tile-name">{item.name}</span>
                  </a>
                </li>
              ))}
              <li>
                <a
                  className="sw-tile"
                  href="https://trezor.io/trezor-suite"
                  target="_blank"
                  rel="noreferrer"
                  title="Trezor Suite — Connect host"
                >
                  <FavMark domain="trezor.io" name="Suite" />
                  <span className="sw-tile-name">Trezor Suite</span>
                </a>
              </li>
            </ul>
          </div>
        ) : (
          <div
            id="sw-panel-community"
            role="tabpanel"
            aria-labelledby="sw-tab-community"
          >
            <p className="muted fee faq-lede">
              ihelpmaybe projects — siblings of this desk.
            </p>
            <ul className="sw-tile-grid sw-tile-grid-community">
              {COMMUNITY.map((item) => (
                <li key={item.name}>
                  <a
                    className="sw-tile sw-tile-community"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    title={item.tag}
                  >
                    <CommunityMark item={item} />
                    <span className="sw-tile-name">{item.name}</span>
                    <span className="sw-tile-tag">{item.tag}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
