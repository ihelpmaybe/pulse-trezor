/**
 * Reown WalletKit — Pulse Perch as the wallet peer (dapps → current transport).
 * Free Cloud projectId required (paste in UI / VITE_REOWN_PROJECT_ID).
 * Namespaces: Pulse + common EVM peers (same eth BIP44 / tx type).
 */
import { Core } from "@walletconnect/core";
import {
  WalletKit,
  type IWalletKit,
  type WalletKitTypes,
} from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { DESK_CHAIN_IDS } from "../chain/client";

const METHODS = [
  "eth_sendTransaction",
  "eth_signTransaction",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "wallet_switchEthereumChain",
  "wallet_getCapabilities",
];

const EVENTS = ["chainChanged", "accountsChanged"];

let kit: IWalletKit | null = null;
let kitProjectId: string | null = null;

export function getWalletKit(): IWalletKit | null {
  return kit;
}

export async function initWalletKit(projectId: string): Promise<IWalletKit> {
  const id = projectId.trim();
  if (!id) throw new Error("Missing Reown projectId");
  if (kit && kitProjectId === id) return kit;

  const core = new Core({ projectId: id });
  kit = await WalletKit.init({
    core,
    metadata: {
      name: "Pulse Perch",
      description:
        "PulseChain-first wallet — WalletConnect peer (EVM-compatible)",
      url:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://github.com/ihelpmaybe/pulse-trezor",
      icons: [],
    },
  });
  kitProjectId = id;
  return kit;
}

/** Advertise all packed EVM chains for the same address. */
export function evmNamespaces(address: string) {
  const chains = DESK_CHAIN_IDS.map((id) => `eip155:${id}`);
  const accounts = DESK_CHAIN_IDS.map((id) => `eip155:${id}:${address}`);
  return {
    eip155: {
      chains,
      methods: METHODS,
      events: EVENTS,
      accounts,
    },
  };
}

/** @deprecated use evmNamespaces — kept name for older callers */
export function pulseNamespaces(address: string) {
  return evmNamespaces(address);
}

export async function approveProposal(
  proposal: WalletKitTypes.SessionProposal,
  address: string,
) {
  if (!kit) throw new Error("WalletKit not ready");
  const namespaces = buildApprovedNamespaces({
    proposal: proposal.params,
    supportedNamespaces: evmNamespaces(address),
  });
  return kit.approveSession({
    id: proposal.id,
    namespaces,
  });
}

export async function rejectProposal(proposal: WalletKitTypes.SessionProposal) {
  if (!kit) return;
  await kit.rejectSession({
    id: proposal.id,
    reason: getSdkError("USER_REJECTED"),
  });
}

export async function pairUri(uri: string) {
  if (!kit) throw new Error("WalletKit not ready");
  const u = uri.trim();
  if (!u.startsWith("wc:")) throw new Error("URI must start with wc:");
  await kit.pair({ uri: u });
}

export function activeSessions(): ReturnType<IWalletKit["getActiveSessions"]> {
  if (!kit) return {};
  return kit.getActiveSessions();
}

export async function disconnectTopic(topic: string) {
  if (!kit) return;
  await kit.disconnectSession({
    topic,
    reason: getSdkError("USER_DISCONNECTED"),
  });
}

/** Drop every active WC session (phishing / “kill all sites”). */
export async function disconnectAllSessions(): Promise<number> {
  if (!kit) return 0;
  const topics = Object.keys(kit.getActiveSessions());
  let n = 0;
  for (const topic of topics) {
    try {
      await kit.disconnectSession({
        topic,
        reason: getSdkError("USER_DISCONNECTED"),
      });
      n += 1;
    } catch {
      /* continue others */
    }
  }
  return n;
}
