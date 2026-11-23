/**
 * Lab Chrome CDP: Connect Perch desk → probe inject eth_chainId / eth_requestAccounts.
 * Env: CDP_PORT=9233 · DESK_URL=http://127.0.0.1:5174/
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
  return out.result?.result?.value;
}

const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
  (r) => r.json(),
);
const browser = await wsRpc(version.webSocketDebuggerUrl);

// Close leftover desk / example tabs so findPerchTab + CDP eval hit the live session
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
  await new Promise((r) => setTimeout(r, 800));
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

// Hard reload first so perch-bridge.js is present BEFORE Connect (session lives in React)
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
if (!perch) {
  console.error("NO_PERCH_TAB_AFTER_RELOAD");
  process.exit(1);
}

// Wait until desk sees Suite desktop channel (probe can lag after reload)
let suiteFace = null;
for (let i = 0; i < 15; i++) {
  suiteFace = await evalOn(
    perch,
    `(() => {
      const status = [...document.querySelectorAll("[role=status]")].map((s) =>
        (s.textContent || "").trim(),
      );
      const text = document.body.innerText || "";
      return {
        suiteUp: status.some((t) => /Suite is up/i.test(t)) || /· Suite\\b/.test(text),
        openSuite: status.some((t) => /open Suite/i.test(t)),
        status: status.slice(0, 3),
      };
    })()`,
  );
  console.log("SUITE_WAIT", i, suiteFace);
  if (suiteFace?.suiteUp) break;
  await new Promise((r) => setTimeout(r, 1000));
}

// Click Connect #1 if watching
const click = await evalOn(
  perch,
  `(() => {
    const btns = [...document.querySelectorAll("button")];
    const disconnect = btns.find((b) => /Disconnect/i.test(b.textContent || ""));
    if (disconnect) return { already: true };
    const connect = btns.find((b) => /Connect #1/i.test(b.textContent || ""));
    if (!connect) return { already: false, found: false, btns: btns.map(b=>b.textContent.trim()).filter(Boolean).slice(0,20) };
    connect.click();
    return { already: false, found: true, clicked: true };
  })()`,
);
console.log("CONNECT_CLICK", click);

// Wait up to ~45s for Disconnect (Suite Allow + emu)
let connected = false;
let face = null;
for (let i = 0; i < 45; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  // refresh page handle
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
  face = await evalOn(
    perch,
    `(() => {
      const text = document.body.innerText || "";
      const btns = [...document.querySelectorAll("button")].map((b) => (b.textContent || "").trim());
      return {
        disconnect: btns.some((t) => /Disconnect/i.test(t)),
        connecting: btns.some((t) => /Connecting/i.test(t)),
        status: [...document.querySelectorAll("[role=status]")].map((s) => s.textContent.trim()).slice(0, 3),
      };
    })()`,
  );
  console.log("WAIT", i, face);
  if (face?.disconnect) {
    connected = true;
    break;
  }
}

if (!connected) {
  const out = { ok: false, stage: "connect", click, face };
  writeFileSync("tmp-ext-connect-chain.json", JSON.stringify(out, null, 2));
  console.log("EXT_CONNECT_FAIL");
  browser.ws.close();
  process.exit(1);
}

const bridgeReady = await evalOn(
  perch,
  `({
    inject: typeof window.__pulsePerchInject,
    disconnect: [...document.querySelectorAll("button")].some((b) =>
      /Disconnect/i.test(b.textContent || ""),
    ),
  })`,
);
console.log("BRIDGE_READY", bridgeReady);

// Probe dapp inject → background → perch-bridge
await browser.send("Target.createTarget", { url: DAPP });
await new Promise((r) => setTimeout(r, 2000));
list = await listPages();
const dapp = list.find(
  (p) =>
    p.type === "page" &&
    String(p.url || "").includes("example.com") &&
    p.webSocketDebuggerUrl,
);

const inject = dapp
  ? await evalOn(
      dapp,
      `JSON.stringify({
        ethereum: !!window.ethereum,
        isPulsePerch: !!(window.ethereum && window.ethereum.isPulsePerch),
        isMetaMask: !!(window.ethereum && window.ethereum.isMetaMask)
      })`,
    )
  : null;
const injectObj = inject ? JSON.parse(inject) : null;
console.log("INJECT", injectObj);

let chain = null;
let accounts = null;
if (dapp && injectObj?.isPulsePerch) {
  const { ws, send } = await wsRpc(dapp.webSocketDebuggerUrl);
  await send("Runtime.enable");
  const chainRaw = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      try {
        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        return { ok: true, chainId };
      } catch (e) {
        return { ok: false, code: e.code, message: String(e.message || e) };
      }
    })()`,
  });
  chain = chainRaw.result?.result?.value;
  console.log("CHAIN", chain);

  const acctRaw = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        return { ok: true, accounts };
      } catch (e) {
        return { ok: false, code: e.code, message: String(e.message || e) };
      }
    })()`,
  });
  accounts = acctRaw.result?.result?.value;
  console.log("ACCOUNTS", accounts);
  ws.close();
}

const ok = !!(connected && chain?.ok && accounts?.ok);
const out = {
  ok,
  connected,
  inject: injectObj,
  chain,
  accounts,
};
writeFileSync("tmp-ext-connect-chain.json", JSON.stringify(out, null, 2));
console.log(ok ? "EXT_CONNECT_CHAIN_OK" : "EXT_CONNECT_CHAIN_PARTIAL");
browser.ws.close();
process.exit(ok ? 0 : 1);
