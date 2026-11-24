/**
 * Approval inventory + revoke for the desk (grants arrive via Apps / WC).
 */
import {
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { type Address, type Hash } from "viem";
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
import { encodeErc20Approve } from "../chain/tokens";
import { humanTrezorError } from "../trezor/connect";
import {
  sendPlsWithTrezor,
  type BroadcastResult,
} from "../trezor/signPulseTx";
import { waitForTxStatus } from "../chain/client";
import type { Session } from "../ui/deskStorage";

type TxStatus = "pending" | "confirmed" | "reverted" | "timeout" | null;

export function useDeskApprovals(opts: {
  active: Session | null;
  session: Session | null;
  chainId: DeskChainId;
  effectiveRpc: RpcOverride | undefined;
  fullBag: FullBag | null;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setErr: Dispatch<SetStateAction<string | null>>;
  setLastTx: Dispatch<SetStateAction<Hash | null>>;
  setStuckTx: Dispatch<SetStateAction<BroadcastResult | null>>;
  setTxStatus: Dispatch<SetStateAction<TxStatus>>;
  refreshActivity: (addr: Address, cid: DeskChainId) => void | Promise<void>;
}) {
  const {
    active,
    session,
    chainId,
    effectiveRpc,
    fullBag,
    setBusy,
    setErr,
    setLastTx,
    setStuckTx,
    setTxStatus,
    refreshActivity,
  } = opts;

  const [nftApprovals, setNftApprovals] = useState<NftApprovalRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [apprMeta, setApprMeta] = useState<ApprovalScanMeta | null>(null);
  const [apprBusy, setApprBusy] = useState(false);
  const [apprErr, setApprErr] = useState<string | null>(null);
  const [revokeSel, setRevokeSel] = useState<Set<string>>(() => new Set());

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
      derivationPath: session.derivationPath,
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
      derivationPath: session.derivationPath,
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

  return {
    nftApprovals,
    approvals,
    apprMeta,
    apprBusy,
    apprErr,
    revokeSel,
    setRevokeSel,
    approvalKey,
    refreshApprovals,
    onRevokeNft,
    onRevoke,
    onBulkRevoke,
  };
}
