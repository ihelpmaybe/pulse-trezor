/**
 * Lab CDP: desk account/chain change → dapp ethereum accountsChanged / chainChanged.
 * Requires: CDP :9233 · desk :5174 · Pulse Perch 0.1.2+ unpacked · Suite for Connect.
 * Env: CDP_PORT · DESK_URL · DAPP_URL
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";

const PORT = Number(process.env.CDP_PORT || 9233);
const DESK = process.env.DESK_URL || "http://127.0.0.1:5174/";
const DAPP = process.env.DAPP_URL || "https://example.com/";

function wsRpc(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.on("open", () => {
      resolve({
        ws,
        send: (method, params = {}) =>
          new Promise((res) => {
            const i = ++id;
            pending.set(i, res);
            ws.send(JSON.stringify({ id: i, method, params }));
          }),
      });
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });
    ws.on("error", reject);
  });
}

async function listPages() {
  return fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
}

async function evalOn(page, expression, { awaitPromise = false } = {}) {
  const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
  await send("Runtime.enable");
  const out = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise,
  });
  ws.close();
  if (out.result?.exceptionDetails) {
    return {
      __evalError: out.result.exceptionDetails.text || "eval error",
    };
  }
  return out.result?.result?.value;
}

const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
  (r) => r.json(),
);
const browser = await wsRpc(version.webSocketDebuggerUrl);

{
  const stale = await listPages();
  for (const p of stale) {
    if (p.type !== "page" || !p.id) continue;
    const u = String(p.url || "");
    if (
      /127\.0\.0\.1:517[34]/.test(u) ||
      /localhost:517[34]/.test(u) ||
      u.includes("example.com")
    ) {
      try {
        await browser.send("Target.closeTarget", { targetId: p.id });
      } catch {
        /* ignore */
      }
    }
  }
  await new Promise((r) => setTimeout(r, 600));
}

const created = await browser.send("Target.createTarget", { url: DESK });
const perchTargetId = created.result?.targetId;
await new Promise((r) => setTimeout(r, 2500));

let list = await listPages();
let perch =
  (perchTargetId && list.find((p) => p.id === perchTargetId)) ||
  list.find(
    (p) =>
      p.type === "page" &&
      /127\.0\.0\.1:517[34]/.test(p.url || "") &&
      p.webSocketDebuggerUrl,
  );
if (!perch) {
  console.error("NO_PERCH_TAB");
  process.exit(1);
}

{
  const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
  await send("Page.enable");
  await send("Page.reload", { ignoreCache: true });
  ws.close();
}
await new Promise((r) => setTimeout(r, 3000));
list = await listPages();
perch =
  (perchTargetId && list.find((p) => p.id === perchTargetId)) ||
  list.find(
    (p) =>
      p.type === "page" &&
      /127\.0\.0\.1:517[34]/.test(p.url || "") &&
      p.webSocketDebuggerUrl,
  );

for (let i = 0; i < 12; i++) {
  const suiteFace = await evalOn(
    perch,
    `(() => {
      const text = document.body.innerText || "";
      return { suiteUp: /· Suite\\b/.test(text) || /Suite is up/i.test(text) };
    })()`,
  );
  console.log("SUITE_WAIT", i, suiteFace);
  if (suiteFace?.suiteUp) break;
  await new Promise((r) => setTimeout(r, 800));
}

const click = await evalOn(
  perch,
  `(() => {
    const btns = [...document.querySelectorAll("button")];
    if (btns.some((b) => /Disconnect/i.test(b.textContent || "")))
      return { already: true };
    const connect = btns.find((b) => /Connect #1/i.test(b.textContent || ""));
    if (!connect) return { found: false };
    connect.click();
    return { found: true, clicked: true };
  })()`,
);
console.log("CONNECT_CLICK", click);

let connected = false;
for (let i = 0; i < 45; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  list = await listPages();
  perch =
    (perchTargetId && list.find((p) => p.id === perchTargetId)) ||
    list.find(
      (p) =>
        p.type === "page" &&
        /127\.0\.0\.1:517[34]/.test(p.url || "") &&
        p.webSocketDebuggerUrl,
    );
  if (!perch) continue;
  const face = await evalOn(
    perch,
    `({
      disconnect: [...document.querySelectorAll("button")].some((b) =>
        /Disconnect/i.test(b.textContent || ""),
      ),
    })`,
  );
  console.log("WAIT", i, face);
  if (face?.disconnect) {
    connected = true;
    break;
  }
}

if (!connected) {
  const out = { ok: false, stage: "connect" };
  writeFileSync("tmp-ext-events.json", JSON.stringify(out, null, 2));
  console.log("EXT_EVENTS_FAIL_CONNECT");
  browser.ws.close();
  process.exit(1);
}

await browser.send("Target.createTarget", { url: DAPP });
await new Promise((r) => setTimeout(r, 2500));
list = await listPages();
const dapp = list.find(
  (p) =>
    p.type === "page" &&
    String(p.url || "").includes("example.com") &&
    p.webSocketDebuggerUrl,
);
if (!dapp) {
  writeFileSync(
    "tmp-ext-events.json",
    JSON.stringify({ ok: false, stage: "dapp" }, null, 2),
  );
  console.log("EXT_EVENTS_FAIL_DAPP");
  browser.ws.close();
  process.exit(1);
}

const hooked = await evalOn(
  dapp,
  `(async () => {
    if (!window.ethereum?.isPulsePerch) {
      return { ok: false, why: "no perch ethereum" };
    }
    window.__perchEvents = [];
    const push = (kind, args) => {
      window.__perchEvents.push({ kind, args, t: Date.now() });
    };
    window.ethereum.on("accountsChanged", (...args) => push("accountsChanged", args));
    window.ethereum.on("chainChanged", (...args) => push("chainChanged", args));
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } catch (e) {
      return { ok: false, why: String(e.message || e) };
    }
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    return { ok: true, chainId, n: window.__perchEvents.length };
  })()`,
  { awaitPromise: true },
);
console.log("HOOKED", hooked);
if (!hooked?.ok) {
  writeFileSync(
    "tmp-ext-events.json",
    JSON.stringify({ ok: false, stage: "hook", hooked }, null, 2),
  );
  console.log("EXT_EVENTS_FAIL_HOOK");
  browser.ws.close();
  process.exit(1);
}

const before = await evalOn(dapp, `window.__perchEvents.length`);

// Switch chain on desk (943 ↔ 369) via network <select>
const chainFlip = await evalOn(
  perch,
  `(() => {
    const sel = document.querySelector("select");
    if (!sel) return { ok: false, why: "no select" };
    const cur = sel.value;
    const opts = [...sel.options].map((o) => o.value);
    const next = cur === "943" ? "369" : opts.includes("943") ? "943" : opts.find((v) => v !== cur);
    if (!next) return { ok: false, why: "no alt chain", cur, opts };
    sel.value = next;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true, from: cur, to: next };
  })()`,
);
console.log("CHAIN_FLIP", chainFlip);

let chainHit = null;
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 400));
  chainHit = await evalOn(
    dapp,
    `({
      n: window.__perchEvents.length,
      events: window.__perchEvents.slice(),
    })`,
  );
  if (
    chainHit?.events?.some(
      (e) =>
        e.kind === "chainChanged" &&
        String(e.args?.[0] || "").toLowerCase() ===
          `0x${Number(chainFlip.to).toString(16)}`,
    )
  ) {
    break;
  }
}
console.log("AFTER_CHAIN", chainHit);

// Prefer account switch if a second account button exists
const acctFlip = await evalOn(
  perch,
  `(() => {
    const btns = [...document.querySelectorAll("button")];
    const accts = btns.filter((b) => /Account #\\d+/i.test(b.textContent || "") || /Account #\\d+/i.test(b.getAttribute("aria-label") || ""));
    // listed account rows are buttons with Account #N in aria-label
    const labeled = btns.filter((b) =>
      /Account #\\d+/i.test(b.getAttribute("aria-label") || ""),
    );
    const pool = labeled.length ? labeled : accts;
    if (pool.length < 2) return { ok: false, why: "need 2+ accounts", n: pool.length };
    const other = pool.find((b) => !/, selected/i.test(b.getAttribute("aria-label") || ""));
    (other || pool[1]).click();
    return { ok: true, n: pool.length };
  })()`,
);
console.log("ACCT_FLIP", acctFlip);

let acctHit = null;
if (acctFlip?.ok) {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 400));
    acctHit = await evalOn(
      dapp,
      `({
        n: window.__perchEvents.length,
        events: window.__perchEvents.slice(),
      })`,
    );
    if (acctHit?.events?.some((e) => e.kind === "accountsChanged")) break;
  }
  console.log("AFTER_ACCT", acctHit);
}

const events = chainHit?.events || [];
const chainOk = !!(
  chainFlip?.ok &&
  events.some((e) => e.kind === "chainChanged")
);
const acctOk = acctFlip?.ok
  ? !!(acctHit?.events || events).some((e) => e.kind === "accountsChanged")
  : null; // skipped

const ok = chainOk && (acctOk === null || acctOk);
const out = {
  ok,
  before,
  chainFlip,
  acctFlip,
  chainOk,
  acctOk,
  events,
};
writeFileSync("tmp-ext-events.json", JSON.stringify(out, null, 2));
console.log(ok ? "EXT_EVENTS_OK" : "EXT_EVENTS_FAIL");
browser.ws.close();
process.exit(ok ? 0 : 1);
