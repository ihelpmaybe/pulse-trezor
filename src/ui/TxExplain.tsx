/**
 * Face explain + dry-run — same clearSign strip as Sites, for Send/custom.
 */
import { useState } from "react";
import type { Address, Hex } from "viem";
import {
  clearSignTx,
  explainClearLines,
  worstTone,
} from "../wc/clearSign";
import {
  makePublicClient,
  type DeskChainId,
  type RpcOverride,
} from "../chain/client";

export function TxExplain(props: {
  chainId: DeskChainId;
  account: Address | null;
  to: string;
  data?: string;
  valueWei?: bigint;
  rpc?: RpcOverride;
}) {
  const data = props.data?.trim() || "0x";
  const valueHex =
    props.valueWei != null && props.valueWei > 0n
      ? `0x${props.valueWei.toString(16)}`
      : undefined;
  const lines = clearSignTx({
    to: props.to || null,
    data,
    valueHex,
    method: "eth_sendTransaction",
    dappUrl: "pulse-perch://desk",
  });
  const tone = worstTone(lines);
  const [sim, setSim] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!props.to) return null;

  return (
    <div className={`clear-box ${tone} tx-explain`}>
      <p className="muted fee">Explain: {explainClearLines(lines)}</p>
      <ul className="clear-list">
        {lines.slice(0, 6).map((l, i) => (
          <li key={i} className={l.tone}>
            <span className="t">{l.title}</span>
            <span className="d">{l.detail}</span>
          </li>
        ))}
      </ul>
      {sim ? (
        <p className="muted fee" role="status">
          {sim}
        </p>
      ) : null}
      <button
        type="button"
        className="btn ghost"
        disabled={busy || !props.account}
        onClick={() => {
          if (!props.account) return;
          setBusy(true);
          setSim("Simulating…");
          void makePublicClient(props.chainId, props.rpc)
            .estimateGas({
              account: props.account,
              to: props.to as Address,
              value: props.valueWei ?? 0n,
              data: data as Hex,
            })
            .then((gas) => {
              setSim(`Dry-run OK — estimateGas ${gas.toString()}`);
            })
            .catch((e) => {
              setSim(
                `Dry-run failed — ${e instanceof Error ? e.message : String(e)}`,
              );
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "…" : "Dry-run"}
      </button>
    </div>
  );
}
