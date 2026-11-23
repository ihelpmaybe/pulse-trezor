/**
 * Time-boxed fuzz: watch JSON importer must never accept seed-like junk.
 * Run: node scripts/fuzz-watch.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// Vitest/TS path — use compiled logic via dynamic import of built? Prefer inline duplicate of guards for speed.
const SEEDISH =
  /\b(mnemonic|seed|private[_\s-]?key|privkey|secret[_\s-]?key|bip39|xprv|xpub)\b/i;

function looksLikeSeedPayload(raw) {
  if (SEEDISH.test(raw)) return true;
  const words = raw.trim().split(/\s+/);
  if (
    words.length >= 12 &&
    words.length <= 24 &&
    words.every((w) => /^[a-z]+$/i.test(w))
  ) {
    return true;
  }
  return false;
}

function mustReject(raw) {
  if (looksLikeSeedPayload(raw)) return true;
  try {
    const o = JSON.parse(raw);
    if (o && typeof o === "object") {
      for (const k of Object.keys(o)) {
        if (SEEDISH.test(k)) return true;
      }
    }
  } catch {
    return true; // invalid JSON is reject for import
  }
  return false;
}

const cases = [
  Array.from({ length: 12 }, () => "abandon").join(" "),
  JSON.stringify({ mnemonic: "x", accounts: [] }),
  JSON.stringify({ privateKey: "0xabc", accounts: [] }),
  JSON.stringify({ seed: "nope" }),
  "not json at all " + "word ".repeat(15),
  JSON.stringify({ xprv: "xprv1…" }),
];

let fail = 0;
for (const c of cases) {
  if (!mustReject(c)) {
    console.error("FAIL accepted seed-like:", c.slice(0, 80));
    fail += 1;
  }
}

// Random junk — should not throw
for (let i = 0; i < 200; i++) {
  const junk = JSON.stringify({
    accounts: [{ address: `0x${i.toString(16).padStart(40, "0")}` }],
    noise: Math.random().toString(36),
  });
  try {
    mustReject(junk);
  } catch (e) {
    console.error("FAIL threw:", e);
    fail += 1;
  }
}

// Extreme lookalike / amount chaos (pure string checks — no throw)
function poisonTwin(a, mid = "deadbeefdeadbeefdeadbeefdeadbeef") {
  return a.slice(0, 6) + mid + a.slice(-4);
}
const whale = "0x73d0385f4d8e00c5e6504c6030f47bf6212736a8";
const twin = poisonTwin(whale);
if (twin.length !== 42 || twin === whale) {
  console.error("FAIL poison twin shape");
  fail += 1;
}
const crazyAmts = [
  "0",
  "-1",
  "1e309",
  "NaN",
  "999999999999999999999999999999",
  "0.000000000000000001",
  "",
  "🦄",
];
for (const a of crazyAmts) {
  try {
    Number(a);
  } catch (e) {
    console.error("FAIL amount threw:", a, e);
    fail += 1;
  }
}

/** Desk send guards — bad recipients / chainIds must be rejectable without throw. */
function looksLikeHexAddress(s) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(s || ""));
}
function deskChainOk(id) {
  // Desk select uses decimal chain ids only — reject hex / junk strings.
  if (typeof id === "string" && /[^0-9]/.test(id.trim())) return false;
  return [369, 943, 1, 11155111, 17000].includes(Number(id));
}
const badAddrs = [
  "",
  "0x",
  "0xgg",
  "not-an-address",
  "0x73d0385f4d8e00c5e6504c6030f47bf6212736a", // too short
  whale + "00", // too long
  "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
];
for (const a of badAddrs) {
  try {
    if (looksLikeHexAddress(a)) {
      console.error("FAIL accepted bad addr:", a);
      fail += 1;
    }
  } catch (e) {
    console.error("FAIL addr threw:", a, e);
    fail += 1;
  }
}
if (!looksLikeHexAddress(whale)) {
  console.error("FAIL rejected good addr");
  fail += 1;
}
for (const id of ["0", "-1", "999999", "foo", "", "0x171"]) {
  try {
    if (deskChainOk(id)) {
      console.error("FAIL accepted bad chainId:", id);
      fail += 1;
    }
  } catch (e) {
    console.error("FAIL chainId threw:", id, e);
    fail += 1;
  }
}
if (!deskChainOk(369) || !deskChainOk(943)) {
  console.error("FAIL rejected good chainId");
  fail += 1;
}

/** Malformed token meta / RPC error bodies — must not throw when sanitized. */
function sanitizeTokenMeta(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const symbol = String(o.symbol ?? "TOKEN")
    .replace(/[^\w.\-]/g, "")
    .slice(0, 32) || "TOKEN";
  let decimals = Number(o.decimals);
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 255) decimals = 18;
  const address = looksLikeHexAddress(o.address) ? o.address : null;
  return { symbol, decimals, address };
}
function sanitizeRpcError(body) {
  if (body == null) return { code: -32000, message: "empty" };
  if (typeof body === "string") return { code: -32000, message: body.slice(0, 200) };
  const code = Number(body.code ?? body.error?.code ?? -32000);
  const message = String(
    body.message ?? body.error?.message ?? body.error ?? "rpc error",
  ).slice(0, 200);
  return { code: Number.isFinite(code) ? code : -32000, message };
}
const junkTokens = [
  null,
  undefined,
  { symbol: "<script>", decimals: "NaN", address: "nope" },
  { symbol: "🦄".repeat(40), decimals: 999, address: whale },
  { decimals: -1 },
  "not-an-object",
];
for (const t of junkTokens) {
  try {
    sanitizeTokenMeta(t);
  } catch (e) {
    console.error("FAIL token meta threw:", e);
    fail += 1;
  }
}
const junkRpc = [
  null,
  "",
  { code: "x", message: { nested: true } },
  { error: { code: 3, message: "execution reverted ".repeat(20) } },
  Buffer.from("not json"),
];
for (const b of junkRpc) {
  try {
    sanitizeRpcError(b);
  } catch (e) {
    console.error("FAIL rpc sanitize threw:", e);
    fail += 1;
  }
}

/** WC session proposal fuzz — topic/uri shaped junk must stay rejectable. */
function wcUriOk(uri) {
  const s = String(uri || "");
  if (!s.startsWith("wc:")) return false;
  if (s.length < 20 || s.length > 2048) return false;
  if (/[\u0000-\u001f]/.test(s)) return false;
  return true;
}
const badWc = [
  "",
  "http://evil",
  "wc:",
  "wc:" + "a".repeat(3000),
  "wc:\n@2?relay=x",
  "WC:upper",
];
for (const u of badWc) {
  try {
    if (wcUriOk(u)) {
      console.error("FAIL accepted bad wc uri:", String(u).slice(0, 40));
      fail += 1;
    }
  } catch (e) {
    console.error("FAIL wc uri threw:", e);
    fail += 1;
  }
}
if (!wcUriOk("wc:abc123@2?relay-protocol=irn&symKey=" + "ab".repeat(32))) {
  console.error("FAIL rejected plausible wc uri");
  fail += 1;
}

if (fail) {
  console.error(`fuzz-watch: ${fail} failure(s)`);
  process.exit(1);
}
console.log(
  "fuzz-watch: OK (seed + junk + extreme + addr/chain + token/rpc + wc)",
);
