/**
 * Watch registry / bag snapshot export + import.
 */
import {
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Address } from "viem";
import { loadAddressBook, type BookEntry } from "../chain/addressBook";
import {
  bagCacheCount,
  buildBagCacheEntry,
  decodeBagCacheEntry,
  parseBagSnapshotJson,
  saveBagCache,
  type BagFaceSnapshot,
} from "../chain/bagCache";
import type { DeskChainId } from "../chain/client";
import type { CustomToken } from "../chain/customTokens";
import type { FullBag } from "../chain/portfolio";
import type { PackToken } from "../chain/tokens";
import type { ListedAccount } from "../trezor/connect";
import { decodeSyncPayload } from "../chain/syncPair";
import {
  buildWatchRegistryExport,
  parseWatchImportJson,
} from "../chain/watchImport";
import { saveWatch, type Session } from "../ui/deskStorage";

type TokenRow = { token: PackToken; raw: bigint; formatted: string };

export function useDeskWatch(opts: {
  active: Session | null;
  session: Session | null;
  watch: Session | null;
  accountList: ListedAccount[];
  deviceId: string;
  chainId: DeskChainId;
  balance: bigint | null;
  tokenRows: TokenRow[];
  customRows: { token: CustomToken; raw: bigint; formatted: string }[];
  fullBag: FullBag | null;
  activity: BagFaceSnapshot["activity"];
  nfts: BagFaceSnapshot["nfts"];
  nftsTruncated: number;
  acctHexStakes: Record<string, number>;
  setWatch: Dispatch<SetStateAction<Session | null>>;
  setAccountIndex: Dispatch<SetStateAction<number>>;
  setAddressBook: Dispatch<SetStateAction<BookEntry[]>>;
  setChainId: Dispatch<SetStateAction<DeskChainId>>;
  setErr: Dispatch<SetStateAction<string | null>>;
  refreshBalances: (addr: Address, cid: DeskChainId) => void | Promise<void>;
  applyImportedBag: (
    face: BagFaceSnapshot,
    addr: Address,
    cid: DeskChainId,
  ) => void;
}) {
  const {
    active,
    session,
    watch,
    accountList,
    deviceId,
    chainId,
    balance,
    tokenRows,
    customRows,
    fullBag,
    activity,
    nfts,
    nftsTruncated,
    acctHexStakes,
    setWatch,
    setAccountIndex,
    setAddressBook,
    setChainId,
    setErr,
    refreshBalances,
    applyImportedBag,
  } = opts;

  const [watchImportBusy, setWatchImportBusy] = useState(false);

  function exportWatchJson() {
    const payload = buildWatchRegistryExport({
      accounts: accountList.map((a) => ({
        address: a.address,
        derivationIndex: a.derivationIndex,
        derivationPath: a.derivationPath,
      })),
      watch: watch
        ? { address: watch.address, derivationIndex: watch.derivationIndex }
        : session
          ? {
              address: session.address,
              derivationIndex: session.derivationIndex,
            }
          : null,
      addressBook: loadAddressBook(),
      chainId,
      walletFingerprint: deviceId
        ? `trezor:${deviceId}`
        : watch
          ? "watch"
          : "perch",
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-watch-registry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportBagSnapshot() {
    if (!active) return;
    const stakeCount =
      fullBag?.stakeCount ??
      acctHexStakes[active.address.toLowerCase()] ??
      0;
    const entry = buildBagCacheEntry(chainId, active.address, {
      pls: balance,
      stakeCount,
      tokenRows,
      customRows,
      fullBag,
      activity,
      nfts,
      nftsTruncated,
    });
    const payload = {
      ...entry,
      exportedAt: entry.savedAt,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-perch-bag-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyWatchImportText(text: string) {
    const sync = decodeSyncPayload(text);
    const result = sync.ok ? sync.import : parseWatchImportJson(text);
    if (!result.ok) {
      setErr(
        result.error ||
          (!sync.ok ? sync.error : undefined) ||
          "Import failed.",
      );
      return false;
    }
    setAddressBook(loadAddressBook());
    if (result.accounts[0]) {
      const a = result.accounts[0];
      const idx = a.derivationIndex ?? 0;
      const sess = {
        address: a.address,
        derivationIndex: idx,
        derivationPath: a.derivationPath || `m/44'/60'/0'/0/${idx}`,
        deviceId: "imported-watch",
      };
      setWatch(sess);
      saveWatch(sess);
      if (typeof a.derivationIndex === "number") {
        setAccountIndex(a.derivationIndex);
      }
      void refreshBalances(result.accounts[0].address, chainId);
    }
    setErr(null);
    return true;
  }

  function onImportWatchFile(file: File) {
    setWatchImportBusy(true);
    setErr(null);
    void file
      .text()
      .then((text) => {
        applyWatchImportText(text);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setWatchImportBusy(false));
  }

  function onImportBagFile(file: File) {
    setWatchImportBusy(true);
    setErr(null);
    void file
      .text()
      .then((text) => {
        const parsed = parseBagSnapshotJson(text);
        if (!parsed.ok) {
          setErr(parsed.error);
          return;
        }
        saveBagCache(parsed.entry);
        const face = decodeBagCacheEntry(parsed.entry);
        const addr = parsed.entry.address;
        const cid = parsed.entry.chainId;
        if (cid !== chainId) setChainId(cid);
        // Point watch at the imported address so the face can show it.
        const sess: Session = {
          address: addr,
          derivationIndex: 0,
          derivationPath: `m/44'/60'/0'/0/0`,
          deviceId: "imported-bag",
        };
        setWatch(sess);
        saveWatch(sess);
        applyImportedBag(face, addr, cid);
        setErr(null);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setWatchImportBusy(false));
  }

  return {
    watchImportBusy,
    setWatchImportBusy,
    exportWatchJson,
    exportBagSnapshot,
    applyWatchImportText,
    onImportWatchFile,
    onImportBagFile,
    bagCacheCount,
  };
}
