import { describe, expect, it, vi } from "vitest";
import {
  ProviderRpcError,
  PulsePerchProvider,
  type InjectedHost,
} from "./eip1193";

function mockHost(partial: Partial<InjectedHost> = {}): InjectedHost {
  return {
    getSelectedAddress: () => "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
    getChainId: () => 943,
    switchChain: vi.fn(async () => {}),
    sendTransaction: vi.fn(async () => "0xabc"),
    personalSign: vi.fn(async () => "0xsig"),
    signTypedData: vi.fn(async () => "0xtyped"),
    ...partial,
  };
}

describe("PulsePerchProvider", () => {
  it("returns chainId hex + accounts", async () => {
    const p = new PulsePerchProvider(mockHost());
    expect(await p.request({ method: "eth_chainId" })).toBe("0x3af");
    expect(await p.request({ method: "net_version" })).toBe("943");
    const accounts = (await p.request({
      method: "eth_requestAccounts",
    })) as string[];
    expect(accounts[0]?.toLowerCase()).toContain("0x73d0");
  });

  it("rejects when disconnected", async () => {
    const p = new PulsePerchProvider(
      mockHost({ getSelectedAddress: () => null }),
    );
    await expect(
      p.request({ method: "eth_requestAccounts" }),
    ).rejects.toMatchObject({ code: 4100 });
  });

  it("switches desk chains and rejects unknown", async () => {
    const host = mockHost();
    const p = new PulsePerchProvider(host);
    await p.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x171" }],
    });
    expect(host.switchChain).toHaveBeenCalledWith(369);

    await expect(
      p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x89" }],
      }),
    ).rejects.toBeInstanceOf(ProviderRpcError);
  });

  it("wallet_addEthereumChain uses host.addEthereumChain for new packs", async () => {
    const addEthereumChain = vi.fn(async () => {});
    const host = mockHost({
      addEthereumChain,
      getChainId: () => 137,
    });
    const p = new PulsePerchProvider(host);
    await p.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x89",
          chainName: "Polygon",
          rpcUrls: ["https://polygon-rpc.com"],
        },
      ],
    });
    expect(addEthereumChain).toHaveBeenCalled();
  });

  it("wallet_addEthereumChain rejects when host has no adder and pack missing", async () => {
    const p = new PulsePerchProvider(mockHost());
    await expect(
      p.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: "0x89", rpcUrls: ["https://polygon-rpc.com"] }],
      }),
    ).rejects.toBeInstanceOf(ProviderRpcError);
  });

  it("routes eth_sendTransaction", async () => {
    const host = mockHost();
    const p = new PulsePerchProvider(host);
    const hash = await p.request({
      method: "eth_sendTransaction",
      params: [
        {
          to: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
          value: "0x1",
        },
      ],
    });
    expect(hash).toBe("0xabc");
    expect(host.sendTransaction).toHaveBeenCalled();
  });

  it("routes eth_signTypedData_v4", async () => {
    const host = mockHost();
    const p = new PulsePerchProvider(host);
    const typed = {
      types: {
        EIP712Domain: [{ name: "name", type: "string" }],
        Mail: [{ name: "contents", type: "string" }],
      },
      primaryType: "Mail",
      domain: { name: "Perch" },
      message: { contents: "hi" },
    };
    const sig = await p.request({
      method: "eth_signTypedData_v4",
      params: ["0x73d0385F4d8E00C5e6504C6030F47BF6212736A8", typed],
    });
    expect(sig).toBe("0xtyped");
    expect(host.signTypedData).toHaveBeenCalled();

    await expect(
      p.request({ method: "eth_signTypedData_v4", params: [] }),
    ).rejects.toBeInstanceOf(ProviderRpcError);
  });

  it("forwards read-only eth_blockNumber via readRpc", async () => {
    const readRpc = vi.fn(async () => "0x10");
    const p = new PulsePerchProvider(mockHost({ readRpc }));
    await expect(
      p.request({ method: "eth_blockNumber" }),
    ).resolves.toBe("0x10");
    expect(readRpc).toHaveBeenCalledWith("eth_blockNumber", []);
  });

  it("wallet_watchAsset accepts ERC20 and rejects junk", async () => {
    const watchAsset = vi.fn(async () => true);
    const p = new PulsePerchProvider(mockHost({ watchAsset }));
    await expect(
      p.request({
        method: "wallet_watchAsset",
        params: [
          {
            type: "ERC20",
            options: {
              address: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
              symbol: "HEX",
              decimals: 8,
            },
          },
        ],
      }),
    ).resolves.toBe(true);
    expect(watchAsset).toHaveBeenCalled();

    await expect(
      p.request({
        method: "wallet_watchAsset",
        params: [
          {
            type: "ERC20",
            options: { address: "0xbad", symbol: "X", decimals: 18 },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderRpcError);

    await expect(
      p.request({
        method: "wallet_watchAsset",
        params: [
          {
            type: "ERC20",
            options: {
              address: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
              symbol: "seed phrase",
              decimals: 18,
            },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProviderRpcError);
  });
});
