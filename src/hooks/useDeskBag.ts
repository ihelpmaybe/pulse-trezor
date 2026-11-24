/**
 * Bag face data — balances, tokens, activity, NFTs, full bag.
 * Hydrates from local bag cache, then cheap-refreshes; skips stake multicall
 * when stakeCount matches the cached bag.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Address } from "viem";
import { fetchAddressActivity, type ActivityRow } from "../chain/activity";
import {
  buildBagCacheEntry,
  clearBagCache,
  decodeBagCacheEntry,
  loadBagCache,
  saveBagCache,
} from "../chain/bagCache";
import { fetchPlsBalance, type DeskChainId, type RpcOverride } from "../chain/client";
import { humanRpcError } from "../chain/rpcErrors";
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
import type { Session } from "../ui/deskStorage";
import type { BagTab } from "../ui/BagPanel";

type TokenRow = { token: PackToken; raw: bigint; formatted: string };

export function useDeskBag(opts: {
  active: Session | null;
  chainId: DeskChainId;
  effectiveRpc: RpcOverride | undefined;
  bagTab: BagTab;
  asset: "PLS" | string;
  setAsset: Dispatch<SetStateAction<"PLS" | string>>;
  setErr: Dispatch<SetStateAction<string | null>>;
}) {
  const {
    active,
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
  /** When live stakeCount matches cache, keep cached stake rows. */
  const skipStakeFetchRef = useRef(false);
  const faceRef = useRef({
    balance: null as bigint | null,
    stakeCount: 0,
    tokenRows: [] as TokenRow[],
    customRows: [] as { token: CustomToken; raw: bigint; formatted: string }[],
    fullBag: null as FullBag | null,
    activity: [] as ActivityRow[],
    nfts: [] as ScanNft[],
    nftsTruncated: 0,
  });

  faceRef.current = {
    balance,
    stakeCount:
      fullBag?.stakeCount ??
      (active
        ? acctHexStakes[active.address.toLowerCase()] ?? 0
        : 0),
    tokenRows,
    customRows,
    fullBag,
    activity,
    nfts,
    nftsTruncated,
  };

  const persistFace = useCallback(
    (addr: Address, cid: DeskChainId, patch?: Partial<typeof faceRef.current>) => {
      const cur = { ...faceRef.current, ...patch };
      const entry = buildBagCacheEntry(cid, addr, {
        pls: cur.balance,
        stakeCount: cur.stakeCount,
        tokenRows: cur.tokenRows,
        customRows: cur.customRows,
        fullBag: cur.fullBag,
        activity: cur.activity,
        nfts: cur.nfts,
        nftsTruncated: cur.nftsTruncated,
      });
      saveBagCache(entry);
    },
    [],
  );

  function applyCachedFace(addr: Address, cid: DeskChainId): boolean {
    const raw = loadBagCache(cid, addr);
    if (!raw) return false;
    const face = decodeBagCacheEntry(raw);
    const key = addr.toLowerCase();
    setBalance(face.pls);
    setAcctPls(face.pls != null ? { [key]: face.pls } : {});
    setAcctHexStakes(
      face.stakeCount > 0 ? { [key]: face.stakeCount } : {},
    );
    setTokenRows(face.tokenRows);
    setCustomRows(face.customRows);
    setFullBag(face.fullBag);
    setActivity(face.activity);
    setActHasMore(face.activity.length >= actLimit);
    setNfts(face.nfts.length ? face.nfts : face.fullBag?.nfts || []);
    setNftsTruncated(
      face.nfts.length ? face.nftsTruncated : face.fullBag?.nftsTruncated || 0,
    );
    skipStakeFetchRef.current = !!(
      face.fullBag &&
      face.fullBag.stakes.length > 0 &&
      face.stakeCount === face.fullBag.stakeCount
    );
    return true;
  }

  /** Only the clicked / active wallet — never blast the whole account grid. */
  const refreshBalances = useCallback(
    async (addr: Address, cid: DeskChainId) => {
      setBalBusy(true);
      setErr(null);
      const key = addr.toLowerCase();
      try {
        const [b, hexN] = await Promise.all([
          fetchPlsBalance(cid, addr, effectiveRpc),
          cid === 369
            ? fetchHexStakeCount(cid, addr, effectiveRpc).catch(() => 0)
            : Promise.resolve(0),
        ]);
        setBalance(b);
        setAcctPls({ [key]: b });
        setAcctHexStakes(hexN > 0 ? { [key]: hexN } : {});
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

        const cached = loadBagCache(cid, addr);
        const cachedCount = cached?.stakeCount ?? cached?.fullBag?.stakeCount;
        const hasCachedStakes = !!(
          cached?.fullBag &&
          Array.isArray(cached.fullBag.stakes) &&
          cached.fullBag.stakes.length > 0
        );
        let nextFull = faceRef.current.fullBag;
        if (hasCachedStakes && cachedCount === hexN) {
          skipStakeFetchRef.current = true;
          // Keep cached full bag if live count still matches.
          if (!nextFull && cached.fullBag) {
            const face = decodeBagCacheEntry(cached);
            nextFull = face.fullBag;
            setFullBag(face.fullBag);
          }
        } else {
          skipStakeFetchRef.current = false;
          if (cachedCount != null && cachedCount !== hexN) {
            nextFull = null;
            setFullBag(null);
          }
        }

        persistFace(addr, cid, {
          balance: b,
          stakeCount: hexN,
          tokenRows: rows,
          customRows: crows,
          fullBag: nextFull,
        });
      } catch (e) {
        setBalance(null);
        setTokenRows([]);
        setCustomRows([]);
        setAcctPls({});
        setAcctHexStakes({});
        setErr(humanRpcError(e));
      } finally {
        setBalBusy(false);
      }
    },
    [effectiveRpc, setErr, persistFace],
  );

  const refreshActivity = useCallback(
    async (addr: Address, cid: DeskChainId, limit = actLimit) => {
      setActBusy(true);
      setActErr(null);
      try {
        const rows = await fetchAddressActivity(cid, addr, limit);
        setActivity(rows);
        setActHasMore(rows.length >= limit);
        persistFace(addr, cid, { activity: rows });
      } catch (e) {
        setActivity([]);
        setActHasMore(false);
        setActErr(e instanceof Error ? e.message : String(e));
      } finally {
        setActBusy(false);
      }
    },
    [actLimit, persistFace],
  );

  useEffect(() => {
    if (!active) {
      setBalance(null);
      setTokenRows([]);
      setCustomRows([]);
      setFullBag(null);
      setActivity([]);
      setActErr(null);
      setActHasMore(false);
      setActLimit(48);
      setNfts([]);
      setNftsTruncated(0);
      setNftErr(null);
      skipStakeFetchRef.current = false;
      return;
    }
    applyCachedFace(active.address, chainId);
    void refreshBalances(active.address, chainId);
    void refreshActivity(active.address, chainId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate + refresh on active/chain only
  }, [active, chainId, refreshBalances, refreshActivity]);

  useEffect(() => {
    if (asset === "PLS") return;
    const row = tokenRows.find(
      (r) => r.token.address.toLowerCase() === asset.toLowerCase(),
    );
    if (row && row.raw === 0n) setAsset("PLS");
  }, [asset, tokenRows, setAsset]);

  function onLoadFullBag(force = false) {
    if (!active || (chainId !== 369 && chainId !== 943)) return;
    if (
      !force &&
      skipStakeFetchRef.current &&
      fullBag &&
      fullBag.stakes.length > 0
    ) {
      return;
    }
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
        skipStakeFetchRef.current = bag.stakes.length > 0;
        persistFace(active.address, chainId, {
          fullBag: bag,
          stakeCount: bag.stakeCount,
          nfts: bag.nfts,
          nftsTruncated: bag.nftsTruncated,
        });
        if (bag.warnings?.length) {
          setErr(`Full bag partial: ${bag.warnings[0]}`);
        }
      })
      .catch((e) => setErr(humanRpcError(e)))
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
        persistFace(addr, cid, { nfts: rows, nftsTruncated: truncated });
      } catch (e) {
        setNfts([]);
        setNftsTruncated(0);
        setNftErr(e instanceof Error ? e.message : String(e));
      } finally {
        setNftBusy(false);
      }
    },
    [persistFace],
  );

  useEffect(() => {
    if (bagTab !== "nfts" || !active) return;
    void refreshNfts(active.address, chainId);
  }, [bagTab, active, chainId, refreshNfts]);

  useEffect(() => {
    if (bagTab !== "activity" || !active) return;
    void refreshActivity(active.address, chainId);
  }, [bagTab, active, chainId, refreshActivity]);

  useEffect(() => {
    if (bagTab !== "stakes" || !active || chainId !== 369) return;
    if (!fullBag && !bagBusy) onLoadFullBag(false);
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
    skipStakeFetchRef.current = false;
  }

  /** Wipe cached bags on disk (+ optional face clear). Returns how many keys removed. */
  function clearLocalBagData(opts?: { face?: boolean; addressOnly?: boolean }) {
    const n =
      opts?.addressOnly && active
        ? clearBagCache(chainId, active.address)
        : clearBagCache();
    skipStakeFetchRef.current = false;
    if (opts?.face !== false) clearBagFace();
    return n;
  }

  function applyImportedBag(
    entry: {
      pls: bigint | null;
      stakeCount: number;
      tokenRows: TokenRow[];
      customRows: { token: CustomToken; raw: bigint; formatted: string }[];
      fullBag: FullBag | null;
      activity: ActivityRow[];
      nfts: ScanNft[];
      nftsTruncated: number;
    },
    addr: Address,
    cid: DeskChainId,
  ) {
    const key = addr.toLowerCase();
    setBalance(entry.pls);
    setAcctPls(entry.pls != null ? { [key]: entry.pls } : {});
    setAcctHexStakes(
      entry.stakeCount > 0 ? { [key]: entry.stakeCount } : {},
    );
    setTokenRows(entry.tokenRows);
    setCustomRows(entry.customRows);
    setFullBag(entry.fullBag);
    setActivity(entry.activity);
    setNfts(entry.nfts.length ? entry.nfts : entry.fullBag?.nfts || []);
    setNftsTruncated(
      entry.nfts.length
        ? entry.nftsTruncated
        : entry.fullBag?.nftsTruncated || 0,
    );
    skipStakeFetchRef.current = !!(
      entry.fullBag && entry.fullBag.stakes.length > 0
    );
    saveBagCache(
      buildBagCacheEntry(cid, addr, {
        pls: entry.pls,
        stakeCount: entry.stakeCount,
        tokenRows: entry.tokenRows,
        customRows: entry.customRows,
        fullBag: entry.fullBag,
        activity: entry.activity,
        nfts: entry.nfts,
        nftsTruncated: entry.nftsTruncated,
      }),
    );
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
    refreshBalances,
    refreshActivity,
    refreshNfts,
    onLoadFullBag: () => onLoadFullBag(true),
    clearBagFace,
    clearLocalBagData,
    applyImportedBag,
  };
}
