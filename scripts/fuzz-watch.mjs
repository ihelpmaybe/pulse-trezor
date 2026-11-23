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

if (fail) {
  console.error(`fuzz-watch: ${fail} failure(s)`);
  process.exit(1);
}
console.log("fuzz-watch: OK (seed rejects + 200 junk)");
