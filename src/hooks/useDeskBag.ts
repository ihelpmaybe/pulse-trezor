/**
 * Bag face data — balances, tokens, activity, NFTs, full bag.
 */
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Address } from "viem";
import { fetchAddressActivity, type ActivityRow } from "../chain/activity";
import { fetchPlsBalance, type DeskChainId, type RpcOverride } from "../chain/client";
import {
  fetchCustomBalances,
  loadCustomTokens,
  type CustomToken,
} from "../chain/customTokens";
import {
  fetchFullBag,
  fetchHexStakeCount,
  fetchScanNfts,
  type FullBag,
  type ScanNft,
} from "../chain/portfolio";
import { fetchTokenBalances, type PackToken } from "../chain/tokens";
import type { ListedAccount } from "../trezor/connect";
import type { Session } from "../ui/deskStorage";

type TokenRow = { token: PackToken; raw: bigint; formatted: string };

export function useDeskBag(opts: {
  active: Session | null;
  accountList: ListedAccount[];
  chainId: DeskChainId;
  effectiveRpc: RpcOverride | undefined;
  bagTab: "tokens" | "nfts" | "stakes";
  asset: "PLS" | string;
  setAsset: Dispatch<SetStateAction<"PLS" | string>>;
  setErr: Dispatch<SetStateAction<string | null>>;
}) {
  const {
    active,
    accountList,
    chainId,
    effectiveRpc,
    bagTab,
    asset,
    setAsset,
    setErr,
  } = opts;

  const [balance, setBalance] = useState<bigint | null>(null);
  const [acctPls, setAcctPls] = useState<Record<string, bigint>>({});
  const [acctHexStakes, setAcctHexStakes] = useState<Record<string, number>>(
    {},
  );
  const [balBusy, setBalBusy] = useState(false);
  const [tokenRows, setTokenRows] = useState<TokenRow[]>([]);
  const [customRows, setCustomRows] = useState<
    { token: CustomToken; raw: bigint; formatted: string }[]
  >([]);
  const [fullBag, setFullBag] = useState<FullBag | null>(null);
  const [bagBusy, setBagBusy] = useState(false);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [actBusy, setActBusy] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  const [actFilter, setActFilter] = useState<"all" | "in" | "out">("all");
  const [actLimit, setActLimit] = useState(48);
  const [actHasMore, setActHasMore] = useState(false);
  const [nfts, setNfts] = useState<ScanNft[]>([]);
  const [nftsTruncated, setNftsTruncated] = useState(0);
  const [nftBusy, setNftBusy] = useState(false);
  const [nftErr, setNftErr] = useState<string | null>(null);
  const [hideZeroBal, setHideZeroBal] = useState(true);
  const [importAddr, setImportAddr] = useState("");
  const [importBusy, setImportBusy] = useState(false);

  const refreshAcctFace = useCallback(async () => {
    if (accountList.length === 0) {
      setAcctPls({});
      setAcctHexStakes({});
      return;
    }
    const rows = await Promise.all(
      accountList.map(async (a) => {
        const key = a.address.toLowerCase();
        const addr = a.address as Address;
        const [plsR, hexR] = await Promise.allSettled([
          fetchPlsBalance(chainId, addr, effectiveRpc),
          fetchHexStakeCount(chainId, addr, effectiveRpc),
        ]);
        return {
          key,
          pls: plsR.status === "fulfilled" ? plsR.value : null,
          hex: hexR.status === "fulfilled" ? hexR.value : 0,
        };
      }),
    );
    const nextPls: Record<string, bigint> = {};
    const nextHex: Record<string, number> = {};
    for (const r of rows) {
      if (r.pls != null) nextPls[r.key] = r.pls;
      if (r.hex > 0) nextHex[r.key] = r.hex;
    }
    setAcctPls(nextPls);
    setAcctHexStakes(nextHex);
  }, [accountList, chainId, effectiveRpc]);

  useEffect(() => {
    void refreshAcctFace();
  }, [refreshAcctFace]);

  const refreshBalances = useCallback(
    async (addr: Address, cid: DeskChainId) => {
      setBalBusy(true);
      try {
        const b = await fetchPlsBalance(cid, addr, effectiveRpc);
        setBalance(b);
        setAcctPls((prev) => ({ ...prev, [addr.toLowerCase()]: b }));
        const rows = await fetchTokenBalances(cid, addr, effectiveRpc);
        setTokenRows(rows);
        const customs = loadCustomTokens(cid);
        const crows = await fetchCustomBalances(
          cid,
          addr,
          customs,
          effectiveRpc,
        );
        setCustomRows(crows);
      } catch (e) {
        setBalance(null);
        setTokenRows([]);
        setCustomRows([]);
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBalBusy(false);
      }
    },
    [effectiveRpc, setErr],
  );

  const refreshActivity = useCallback(
    async (addr: Address, cid: DeskChainId, limit = actLimit) => {
      setActBusy(true);
      setActErr(null);
      try {
        const rows = await fetchAddressActivity(cid, addr, limit);
        setActivity(rows);
        setActHasMore(rows.length >= limit);
      } catch (e) {
        setActivity([]);
        setActHasMore(false);
        setActErr(e instanceof Error ? e.message : String(e));
      } finally {
        setActBusy(false);
      }
    },
    [actLimit],
  );

  useEffect(() => {
    if (!active) {
      setBalance(null);
      setTokenRows([]);
      setFullBag(null);
      setActivity([]);
      setActErr(null);
      setActHasMore(false);
      setActLimit(48);
      setNfts([]);
      setNftsTruncated(0);
      setNftErr(null);
      return;
    }
    setFullBag(null);
    void refreshBalances(active.address, chainId);
    void refreshActivity(active.address, chainId);
  }, [active, chainId, refreshBalances, refreshActivity]);

  useEffect(() => {
    if (asset === "PLS") return;
    const row = tokenRows.find(
      (r) => r.token.address.toLowerCase() === asset.toLowerCase(),
    );
    if (row && row.raw === 0n) setAsset("PLS");
  }, [asset, tokenRows, setAsset]);

  function onLoadFullBag() {
    if (!active || (chainId !== 369 && chainId !== 943)) return;
    setBagBusy(true);
    setErr(null);
    const skip = new Set(tokenRows.map((r) => r.token.address.toLowerCase()));
    void fetchFullBag(chainId, active.address, effectiveRpc, skip)
      .then((bag) => {
        setFullBag(bag);
        setNfts(bag.nfts);
        setNftsTruncated(bag.nftsTruncated);
        const ak = active.address.toLowerCase();
        setAcctHexStakes((prev) => {
          if (bag.stakeCount > 0) return { ...prev, [ak]: bag.stakeCount };
          const next = { ...prev };
          delete next[ak];
          return next;
        });
        if (bag.warnings?.length) {
          setErr(`Full bag partial: ${bag.warnings[0]}`);
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBagBusy(false));
  }

  const refreshNfts = useCallback(
    async (addr: Address, cid: DeskChainId) => {
      if (cid !== 369 && cid !== 943) {
        setNfts([]);
        setNftsTruncated(0);
        setNftErr("NFTs load on Pulse mainnet / testnet V4.");
        return;
      }
      setNftBusy(true);
      setNftErr(null);
      try {
        const { nfts: rows, truncated } = await fetchScanNfts(cid, addr);
        setNfts(rows);
        setNftsTruncated(truncated);
      } catch (e) {
        setNfts([]);
        setNftsTruncated(0);
        setNftErr(e instanceof Error ? e.message : String(e));
      } finally {
        setNftBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (bagTab !== "nfts" || !active) return;
    void refreshNfts(active.address, chainId);
  }, [bagTab, active, chainId, refreshNfts]);

  useEffect(() => {
    if (bagTab !== "stakes" || !active || chainId !== 369) return;
    if (!fullBag && !bagBusy) onLoadFullBag();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load bag once when Stakes opens
  }, [bagTab, active?.address, chainId]);

  function clearBagFace() {
    setBalance(null);
    setTokenRows([]);
    setCustomRows([]);
    setFullBag(null);
    setActivity([]);
    setNfts([]);
    setNftsTruncated(0);
    setAcctPls({});
    setAcctHexStakes({});
  }

  return {
    balance,
    setBalance,
    acctPls,
    setAcctPls,
    acctHexStakes,
    setAcctHexStakes,
    balBusy,
    tokenRows,
    setTokenRows,
    customRows,
    setCustomRows,
    fullBag,
    setFullBag,
    bagBusy,
    activity,
    actBusy,
    actErr,
    actFilter,
    setActFilter,
    actLimit,
    setActLimit,
    actHasMore,
    nfts,
    nftsTruncated,
    nftBusy,
    nftErr,
    hideZeroBal,
    setHideZeroBal,
    importAddr,
    setImportAddr,
    importBusy,
    setImportBusy,
    refreshAcctFace,
    refreshBalances,
    refreshActivity,
    refreshNfts,
    onLoadFullBag,
    clearBagFace,
  };
}
