/**
 * Add any EVM by chain ID — resolves public RPCs from ethereum-lists (Chainlist).
 */
import { useState } from "react";
import {
  addEvmByChainId,
  getCustomEvmPack,
  isEvmChainId,
  listCustomEvmPacks,
  removeCustomEvmPack,
} from "../chain/evmNetworks";
import {
  chainLabel,
  listSelectableChainIds,
  nativeSymbol,
  type DeskChainId,
} from "../chain/client";

type Props = {
  chainId: DeskChainId;
  setChainId: (id: DeskChainId) => void;
  setAsset: (sym: string) => void;
  setErr?: (msg: string | null) => void;
  /** Compact: no network <select> (Device already has one). */
  hideNetworkSelect?: boolean;
};

export function AddEvmForm({
  chainId,
  setChainId,
  setAsset,
  setErr,
  hideNetworkSelect = false,
}: Props) {
  const [addChainId, setAddChainId] = useState("");
  const [addRpcUrl, setAddRpcUrl] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [tick, setTick] = useState(0);
  void tick;

  const customs = listCustomEvmPacks();

  return (
    <div className="add-evm-form">
      {!hideNetworkSelect ? (
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
      ) : null}

      <p className="muted fee">
        Paste a chain ID from{" "}
        <a
          className="link"
          href="https://chainlist.org"
          target="_blank"
          rel="noreferrer"
        >
          chainlist.org
        </a>{" "}
        / chainid.network — we pull public RPCs from ethereum-lists. Optional
        RPC overrides when the list is empty or gated.
      </p>

      <div className="settings-rpc-grid">
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
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="btn"
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
                setChainId(pack.chainId as DeskChainId);
                setAsset(pack.currency.symbol);
                setAddChainId("");
                setAddRpcUrl("");
                setTick((n) => n + 1);
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
              setTick((n) => n + 1);
            }}
          >
            Remove custom
          </button>
        ) : null}
      </div>

      {customs.length > 0 ? (
        <p className="muted fee">
          Custom:{" "}
          {customs
            .map((c) => `${c.name || "Chain"} (${c.chainId})`)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
