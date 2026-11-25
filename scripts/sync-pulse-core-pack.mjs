/**
 * Sync pulse-core pack between Desk and platform (SYNC4).
 *
 * Desk rpc.json is richer (rpcOptions + EVM peers) — push Desk → platform.
 * tokenlist / deeplinks / indexer: prefer newer or copy both ways when missing.
 *
 *   node scripts/sync-pulse-core-pack.mjs
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const desk = join(root, "src", "pack");
const plat = join(
  root,
  "..",
  "pulse-trezor-platform",
  "packs",
  "pulse-core",
  "v1",
);

function sha(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 12);
}

function ensurePlat() {
  if (!existsSync(plat)) {
    console.error("NO_PLATFORM_PACK", plat);
    process.exit(2);
  }
}

ensurePlat();

const actions = [];

// indexer: platform → desk if desk missing; else keep desk if equal-ish
const idxPlat = join(plat, "indexer.json");
const idxDesk = join(desk, "indexer.json");
if (existsSync(idxPlat) && !existsSync(idxDesk)) {
  copyFileSync(idxPlat, idxDesk);
  actions.push("copied indexer.json platform → desk");
} else if (existsSync(idxPlat) && existsSync(idxDesk) && sha(idxPlat) !== sha(idxDesk)) {
  copyFileSync(idxPlat, idxDesk);
  actions.push("refreshed indexer.json platform → desk");
}

// tokenlist: must match — if diverge, prefer platform (canonical SYNC4 list)
const tlD = join(desk, "tokenlist.json");
const tlP = join(plat, "tokenlist.json");
if (sha(tlD) !== sha(tlP)) {
  copyFileSync(tlP, tlD);
  actions.push("synced tokenlist.json platform → desk");
} else {
  actions.push("tokenlist.json already aligned");
}

// rpc: desk richer → platform
const rpcD = join(desk, "rpc.json");
const rpcP = join(plat, "rpc.json");
if (sha(rpcD) !== sha(rpcP)) {
  copyFileSync(rpcD, rpcP);
  actions.push(`pushed rpc.json desk → platform (${sha(rpcD)})`);
} else {
  actions.push("rpc.json already aligned");
}

// deeplinks: prefer larger desk file when different
const dlD = join(desk, "deeplinks.json");
const dlP = join(plat, "deeplinks.json");
if (sha(dlD) !== sha(dlP)) {
  const deskLen = readFileSync(dlD).length;
  const platLen = readFileSync(dlP).length;
  if (deskLen >= platLen) {
    copyFileSync(dlD, dlP);
    actions.push("pushed deeplinks.json desk → platform");
  } else {
    copyFileSync(dlP, dlD);
    actions.push("synced deeplinks.json platform → desk");
  }
} else {
  actions.push("deeplinks.json already aligned");
}

const stamp = {
  syncedAt: new Date().toISOString(),
  desk,
  platform: plat,
  actions,
  hashes: {
    tokenlist: sha(tlD),
    rpc: sha(rpcD),
    deeplinks: sha(dlD),
    indexer: existsSync(idxDesk) ? sha(idxDesk) : null,
  },
};
writeFileSync(join(desk, "SYNC-STAMP.json"), JSON.stringify(stamp, null, 2));
console.log(JSON.stringify(stamp, null, 2));
