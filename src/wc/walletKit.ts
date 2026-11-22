/**
 * Reown WalletKit — Pulse Desk as the wallet peer (dapps → Trezor).
 * Free Cloud projectId required (paste in UI / VITE_REOWN_PROJECT_ID).
 */
import { Core } from "@walletconnect/core";
import {
  WalletKit,
  type IWalletKit,
  type WalletKitTypes,
} from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";

const PULSE = "eip155:369";

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
      name: "Pulse Desk",
      description:
        "PulseChain Trezor wallet — WalletConnect peer for HEX / PulseX / ProveX",
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

export function pulseNamespaces(address: string) {
  const acct = `${PULSE}:${address}`;
  return {
    eip155: {
      chains: [PULSE],
      methods: METHODS,
      events: EVENTS,
      accounts: [acct],
    },
  };
}

export async function approveProposal(
  proposal: WalletKitTypes.SessionProposal,
  address: string,
) {
  if (!kit) throw new Error("WalletKit not ready");
  const namespaces = buildApprovedNamespaces({
    proposal: proposal.params,
    supportedNamespaces: pulseNamespaces(address),
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
