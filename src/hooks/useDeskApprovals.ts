/**
 * Approve / revoke inventory for the desk.
 */
import {
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  isAddress,
  maxUint256,
  type Address,
  type Hash,
} from "viem";
import {
  fetchApprovalInventory,
  type ApprovalRow,
  type ApprovalScanMeta,
} from "../chain/approvals";
import type { DeskChainId, RpcOverride } from "../chain/client";
import {
  encodeSetApprovalForAll,
  fetchNftApprovalInventory,
  type NftApprovalRow,
} from "../chain/nftApprovals";
import type { FullBag } from "../chain/portfolio";
import {
  encodeErc20Approve,
  parseTokenAmount,
} from "../chain/tokens";
import { humanTrezorError } from "../trezor/connect";
import {
  sendPlsWithTrezor,
  type BroadcastResult,
} from "../trezor/signPulseTx";
import { waitForTxStatus } from "../chain/client";
import type { Session } from "../ui/deskStorage";

type TxStatus = "pending" | "confirmed" | "reverted" | "timeout" | null;
type SelectedToken = {
  address: Address | string;
  symbol: string;
  decimals: number;
} | null;

export function useDeskApprovals(opts: {
  active: Session | null;
  session: Session | null;
  chainId: DeskChainId;
  effectiveRpc: RpcOverride | undefined;
  fullBag: FullBag | null;
  asset: "PLS" | string;
  selectedToken: SelectedToken;
  selectedCustom: { address: string } | null | undefined;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setErr: Dispatch<SetStateAction<string | null>>;
  setLastTx: Dispatch<SetStateAction<Hash | null>>;
  setStuckTx: Dispatch<SetStateAction<BroadcastResult | null>>;
  setTxStatus: Dispatch<SetStateAction<TxStatus>>;
  refreshBalances: (addr: Address, cid: DeskChainId) => void | Promise<void>;
  refreshActivity: (addr: Address, cid: DeskChainId) => void | Promise<void>;
}) {
  const {
    active,
    session,
    chainId,
    effectiveRpc,
    fullBag,
    asset,
    selectedToken,
    selectedCustom,
    setBusy,
    setErr,
    setLastTx,
    setStuckTx,
    setTxStatus,
    refreshBalances,
    refreshActivity,
  } = opts;

  const [nftApprovals, setNftApprovals] = useState<NftApprovalRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [apprMeta, setApprMeta] = useState<ApprovalScanMeta | null>(null);
  const [apprBusy, setApprBusy] = useState(false);
  const [apprErr, setApprErr] = useState<string | null>(null);
  const [revokeSel, setRevokeSel] = useState<Set<string>>(() => new Set());
  const [approveMaxAck, setApproveMaxAck] = useState(false);
  const [spender, setSpender] = useState("");
  const [approveAmt, setApproveAmt] = useState("");

  function approvalKey(row: ApprovalRow): string {
    return `${row.token}:${row.spender}`;
  }

  function refreshApprovals() {
    if (!active) return;
    setApprBusy(true);
    setApprErr(null);
    const extra =
      fullBag?.tokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals,
      })) ?? [];
    void Promise.all([
      fetchApprovalInventory(chainId, active.address, {
        rpc: effectiveRpc,
        extraTokens: extra,
      }),
      fetchNftApprovalInventory(chainId, active.address, effectiveRpc).catch(
        () => [] as NftApprovalRow[],
      ),
    ])
      .then(([{ rows, meta }, nftRows]) => {
        setApprovals(rows);
        setApprMeta(meta);
        setNftApprovals(nftRows);
        setRevokeSel((prev) => {
          const next = new Set<string>();
          for (const r of rows) {
            const k = `${r.token}:${r.spender}`;
            if (prev.has(k)) next.add(k);
          }
          return next;
        });
      })
      .catch((e) => {
        setApprovals([]);
        setNftApprovals([]);
        setApprMeta(null);
        setApprErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setApprBusy(false));
  }

  async function revokeOne(row: ApprovalRow): Promise<boolean> {
    if (!session) return false;
    const data = encodeErc20Approve(row.spender, 0n);
    const broadcast = await sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: row.token,
      value: 0n,
      data,
      derivationIndex: session.derivationIndex,
      rpc: effectiveRpc,
    });
    setLastTx(broadcast.hash);
    setStuckTx(broadcast);
    setTxStatus("pending");
    const st = await waitForTxStatus(chainId, broadcast.hash, effectiveRpc);
    setTxStatus(st);
    if (st === "confirmed") {
      setStuckTx(null);
      return true;
    }
    return false;
  }

  function onRevokeNft(row: NftApprovalRow) {
    if (!session) return;
    setErr(null);
    setBusy(true);
    const data = encodeSetApprovalForAll(row.operator, false);
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: row.collection,
      value: 0n,
      data,
      derivationIndex: session.derivationIndex,
      rpc: effectiveRpc,
    })
      .then((broadcast) => {
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed") {
              setStuckTx(null);
              refreshApprovals();
            }
          },
        );
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      })
      .finally(() => setBusy(false));
  }

  function onRevoke(row: ApprovalRow) {
    if (!session) return;
    setErr(null);
    setLastTx(null);
    setStuckTx(null);
    setTxStatus(null);
    setBusy(true);
    void revokeOne(row)
      .then((ok) => {
        if (ok) {
          refreshApprovals();
          void refreshActivity(session.address, chainId);
        }
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
        setTxStatus(null);
        setStuckTx(null);
      })
      .finally(() => setBusy(false));
  }

  function onBulkRevoke() {
    if (!session || !revokeSel.size) return;
    const rows = approvals.filter((r) => revokeSel.has(approvalKey(r)));
    if (!rows.length) return;
    setErr(null);
    setBusy(true);
    void (async () => {
      let okN = 0;
      try {
        for (const row of rows) {
          const ok = await revokeOne(row);
          if (ok) okN += 1;
          else break;
        }
      } catch (e) {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
        setTxStatus(null);
        setStuckTx(null);
      } finally {
        setBusy(false);
        refreshApprovals();
        void refreshActivity(session.address, chainId);
        if (okN) setRevokeSel(new Set());
      }
    })();
  }

  function onApprove(unlimited: boolean) {
    if (!session) return;
    setErr(null);
    setLastTx(null);
    setTxStatus(null);
    if (chainId !== 369 && !selectedCustom) {
      setErr(
        "Pack-token approve is mainnet only — import a custom token on testnet.",
      );
      return;
    }
    if (!selectedToken || asset === "PLS") {
      setErr("Pick a token from balances.");
      return;
    }
    if (!isAddress(spender)) {
      setErr("Spender must be a valid 0x address.");
      return;
    }
    let raw: bigint;
    try {
      raw = unlimited
        ? maxUint256
        : parseTokenAmount(approveAmt, selectedToken.decimals);
    } catch {
      setErr("Approve amount invalid.");
      return;
    }
    if (!unlimited && raw < 0n) {
      setErr("Approve amount invalid.");
      return;
    }
    setBusy(true);
    const data = encodeErc20Approve(spender as Address, raw);
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: selectedToken.address as Address,
      value: 0n,
      data,
      derivationIndex: session.derivationIndex,
      rpc: effectiveRpc,
    })
      .then((broadcast) => {
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        void refreshBalances(session.address, chainId);
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") {
              setStuckTx(null);
              void refreshBalances(session.address, chainId);
              void refreshActivity(session.address, chainId);
            }
          },
        );
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
        setTxStatus(null);
        setStuckTx(null);
      })
      .finally(() => setBusy(false));
  }

  return {
    nftApprovals,
    approvals,
    apprMeta,
    apprBusy,
    apprErr,
    revokeSel,
    setRevokeSel,
    approveMaxAck,
    setApproveMaxAck,
    spender,
    setSpender,
    approveAmt,
    setApproveAmt,
    approvalKey,
    refreshApprovals,
    onRevokeNft,
    onRevoke,
    onBulkRevoke,
    onApprove,
  };
}
