/**
 * EIP-1193 provider for Pulse Perch.
 * Same-tab inject is a lab wedge; MM-only sites use the MV3 extension shell.
 * Signs still go Connect → Suite → device (dont-pretend).
 */

import {
  DESK_CHAIN_IDS,
  hasChainPack,
  isDeskChainId,
} from "../chain/client";

export type Eip1193Request = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

export type InjectedTx = {
  from?: string;
  to?: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
};

export type WatchAssetParams = {
  type: string;
  options: {
    address: string;
    symbol?: string;
    decimals?: number;
    image?: string;
  };
};

/** EIP-3085 add-chain payload from Chainlist / dapps. */
export type AddEthereumChainParameter = {
  chainId: string;
  chainName?: string;
  nativeCurrency?: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
};

export type InjectedHost = {
  getSelectedAddress: () => string | null;
  getChainId: () => number;
  switchChain: (chainId: number) => Promise<void>;
  /**
   * Chainlist magic — resolve/persist pack (ethereum-lists + optional dapp RPC),
   * then switch. Reject with 4001 if user denies.
   */
  addEthereumChain?: (params: AddEthereumChainParameter) => Promise<void>;
  sendTransaction: (tx: InjectedTx) => Promise<string>;
  personalSign: (message: string, address: string) => Promise<string>;
  signTypedData: (params: unknown) => Promise<string>;
  /** Optional — add ERC-20 to Perch watch list. */
  watchAsset?: (asset: WatchAssetParams) => Promise<boolean>;
  /** Optional — forward safe read-only RPC methods to Perch’s node. */
  readRpc?: (method: string, params: unknown[]) => Promise<unknown>;
};

const READ_RPC_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getLogs",
  "eth_feeHistory",
  "eth_maxPriorityFeePerGas",
]);

export class ProviderRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "ProviderRpcError";
    this.code = code;
    this.data = data;
  }
}

type Listener = (...args: unknown[]) => void;

function asParamList(params: Eip1193Request["params"]): unknown[] {
  if (params == null) return [];
  if (Array.isArray(params)) return params;
  return [params];
}

function toHexChainId(id: number): string {
  return `0x${id.toString(16)}`;
}

function parseChainIdParam(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw ?? "");
  if (s.startsWith("0x") || s.startsWith("0X")) return Number.parseInt(s, 16);
  return Number.parseInt(s, 10);
}

export type PulsePerchProviderOptions = {
  /** Many Pulse sites still gate on MetaMask — claim the flag when injecting. */
  claimMetaMask?: boolean;
};

export class PulsePerchProvider {
  readonly isPulsePerch = true;
  readonly isMetaMask: boolean;
  private host: InjectedHost;
  private listeners = new Map<string, Set<Listener>>();

  constructor(host: InjectedHost, opts: PulsePerchProviderOptions = {}) {
    this.host = host;
    this.isMetaMask = opts.claimMetaMask !== false;
  }

  setHost(host: InjectedHost) {
    this.host = host;
  }

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }

  removeListener(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(...args);
      } catch {
        /* dapp listener bugs shouldn't break Perch */
      }
    }
  }

  /** Host calls when account / chain changes. */
  notifyAccountsChanged(accounts: string[]) {
    this.emit("accountsChanged", accounts);
  }

  notifyChainChanged(chainId: number) {
    this.emit("chainChanged", toHexChainId(chainId));
  }

  async request(args: Eip1193Request): Promise<unknown> {
    const method = args?.method;
    if (!method || typeof method !== "string") {
      throw new ProviderRpcError(4200, "Missing method");
    }
    const params = asParamList(args.params);

    switch (method) {
      case "eth_chainId":
        return toHexChainId(this.host.getChainId());

      case "net_version":
        return String(this.host.getChainId());

      case "eth_accounts": {
        const a = this.host.getSelectedAddress();
        return a ? [a] : [];
      }

      case "eth_requestAccounts": {
        const a = this.host.getSelectedAddress();
        if (!a) {
          throw new ProviderRpcError(
            4100,
            "Connect Trezor in Pulse Perch with Suite up first",
          );
        }
        return [a];
      }

      case "wallet_switchEthereumChain": {
        const obj = (params[0] || {}) as { chainId?: string };
        const id = parseChainIdParam(obj.chainId);
        if (!Number.isFinite(id) || !isDeskChainId(id) || !hasChainPack(id)) {
          throw new ProviderRpcError(
            4902,
            `Unrecognized chain ${obj.chainId}. Add it under Network (chain ID), or use builtins ${DESK_CHAIN_IDS.join(", ")}`,
            { chainId: obj.chainId },
          );
        }
        await this.host.switchChain(id);
        this.notifyChainChanged(id);
        return null;
      }

      case "wallet_addEthereumChain": {
        const obj = (params[0] || {}) as AddEthereumChainParameter;
        const id = parseChainIdParam(obj.chainId);
        if (Number.isFinite(id) && isDeskChainId(id) && hasChainPack(id)) {
          await this.host.switchChain(id);
          this.notifyChainChanged(id);
          return null;
        }
        if (!this.host.addEthereumChain) {
          throw new ProviderRpcError(
            4902,
            `Rejected add-chain ${obj.chainId ?? "?"}. Add the chain ID under Settings → Networks first.`,
            { chainId: obj.chainId },
          );
        }
        if (!obj.chainId) {
          throw new ProviderRpcError(4200, "wallet_addEthereumChain missing chainId");
        }
        await this.host.addEthereumChain({
          chainId: String(obj.chainId),
          chainName: obj.chainName,
          nativeCurrency: obj.nativeCurrency,
          rpcUrls: Array.isArray(obj.rpcUrls) ? obj.rpcUrls : [],
          blockExplorerUrls: obj.blockExplorerUrls,
        });
        const next = this.host.getChainId();
        this.notifyChainChanged(next);
        return null;
      }

      case "eth_sendTransaction": {
        const tx = (params[0] || {}) as InjectedTx;
        if (!tx.to) {
          throw new ProviderRpcError(4200, "Missing tx.to");
        }
        const selected = this.host.getSelectedAddress();
        if (!selected) {
          throw new ProviderRpcError(4100, "No connected account");
        }
        if (tx.from && tx.from.toLowerCase() !== selected.toLowerCase()) {
          throw new ProviderRpcError(
            4100,
            "tx.from does not match connected account",
          );
        }
        return this.host.sendTransaction({ ...tx, from: selected });
      }

      case "personal_sign": {
        const [msg, addr] = params as [string, string];
        const selected = this.host.getSelectedAddress();
        if (!selected) {
          throw new ProviderRpcError(4100, "No connected account");
        }
        const want = (addr || selected).toLowerCase();
        if (want !== selected.toLowerCase()) {
          throw new ProviderRpcError(4100, "Sign address mismatch");
        }
        return this.host.personalSign(String(msg ?? ""), selected);
      }

      case "eth_sign": {
        const [addr, msg] = params as [string, string];
        const selected = this.host.getSelectedAddress();
        if (!selected) {
          throw new ProviderRpcError(4100, "No connected account");
        }
        if ((addr || "").toLowerCase() !== selected.toLowerCase()) {
          throw new ProviderRpcError(4100, "Sign address mismatch");
        }
        return this.host.personalSign(String(msg ?? ""), selected);
      }

      case "eth_signTypedData":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4": {
        const selected = this.host.getSelectedAddress();
        if (!selected) {
          throw new ProviderRpcError(4100, "No connected account");
        }
        if (!params.length) {
          throw new ProviderRpcError(4200, "Missing typed-data params");
        }
        const payload = params.length >= 2 ? params[1] : params[0];
        if (
          payload == null ||
          (typeof payload !== "object" && typeof payload !== "string")
        ) {
          throw new ProviderRpcError(4200, "Malformed typed-data payload");
        }
        if (typeof payload === "object") {
          const o = payload as { primaryType?: unknown; message?: unknown };
          if (o.primaryType == null && o.message == null) {
            throw new ProviderRpcError(4200, "Typed-data missing primaryType/message");
          }
        }
        return this.host.signTypedData(params);
      }

      case "wallet_watchAsset": {
        const raw = (params[0] || {}) as WatchAssetParams;
        const type = String(raw.type || "").toUpperCase();
        const opts = raw.options || ({} as WatchAssetParams["options"]);
        const address = String(opts.address || "");
        const symbol = String(opts.symbol || "").trim();
        const decimals =
          typeof opts.decimals === "number"
            ? opts.decimals
            : Number(opts.decimals);
        if (type !== "ERC20") {
          throw new ProviderRpcError(
            4200,
            `Unsupported asset type ${raw.type ?? "?"}`,
          );
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          throw new ProviderRpcError(4200, "Invalid token address");
        }
        if (
          !symbol ||
          symbol.length > 32 ||
          /\s/.test(symbol) ||
          /seed|mnemonic|private/i.test(symbol)
        ) {
          throw new ProviderRpcError(4200, "Invalid token symbol");
        }
        if (
          !Number.isFinite(decimals) ||
          decimals < 0 ||
          decimals > 36 ||
          !Number.isInteger(decimals)
        ) {
          throw new ProviderRpcError(4200, "Invalid token decimals");
        }
        if (!this.host.watchAsset) {
          throw new ProviderRpcError(
            4200,
            "wallet_watchAsset not available — add token in Perch Balances",
          );
        }
        return this.host.watchAsset({
          type: "ERC20",
          options: {
            address,
            symbol,
            decimals,
            image: opts.image ? String(opts.image) : undefined,
          },
        });
      }

      case "wallet_getCapabilities":
      case "wallet_requestPermissions":
      case "wallet_getPermissions":
        return method === "wallet_getPermissions"
          ? [
              {
                parentCapability: "eth_accounts",
                date: Date.now(),
              },
            ]
          : method === "wallet_requestPermissions"
            ? await this.request({ method: "eth_requestAccounts" }).then(
                (accounts) => [
                  {
                    parentCapability: "eth_accounts",
                    date: Date.now(),
                    caveats: [{ type: "restrictReturnedAccounts", value: accounts }],
                  },
                ],
              )
            : {};

      default:
        if (READ_RPC_METHODS.has(method) && this.host.readRpc) {
          return this.host.readRpc(method, params);
        }
        throw new ProviderRpcError(4200, `Unsupported method: ${method}`);
    }
  }
}

const INJECT_FLAG = "__pulsePerchInjected";

export type AttachResult = {
  provider: PulsePerchProvider;
  replaced: boolean;
};

/** Attach to window.ethereum for this tab (lab). Does not install an extension. */
export function attachInjectedProvider(
  host: InjectedHost,
  opts: PulsePerchProviderOptions = {},
): AttachResult {
  const w = window as Window & {
    ethereum?: PulsePerchProvider;
    [INJECT_FLAG]?: PulsePerchProvider;
  };
  const provider = new PulsePerchProvider(host, opts);
  const prev = w.ethereum;
  const replaced = Boolean(prev && !(prev as { isPulsePerch?: boolean }).isPulsePerch);
  w.ethereum = provider;
  w[INJECT_FLAG] = provider;
  try {
    window.dispatchEvent(new Event("ethereum#initialized"));
  } catch {
    /* ignore */
  }
  return { provider, replaced };
}

export function detachInjectedProvider() {
  const w = window as Window & {
    ethereum?: PulsePerchProvider;
    [INJECT_FLAG]?: PulsePerchProvider;
  };
  if (w.ethereum && (w.ethereum as { isPulsePerch?: boolean }).isPulsePerch) {
    delete w.ethereum;
  }
  delete w[INJECT_FLAG];
}

export function getInjectedProvider(): PulsePerchProvider | null {
  const w = window as Window & { [INJECT_FLAG]?: PulsePerchProvider };
  return w[INJECT_FLAG] ?? null;
}
