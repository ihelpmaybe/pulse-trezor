/**
 * CDP smoke for Pulse Perch MV3 extension.
 * Chrome 137+: --disable-features=DisableLoadExtensionCommandLineSwitch
 * Env: CDP_PORT (default 9232)
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";

const PORT = Number(process.env.CDP_PORT || 9232);

async function wsRpc(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.once("open", res);
    ws.once("error", rej);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id != null && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) => {
    const i = ++id;
    return new Promise((resolve) => {
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  };
  return { ws, send };
}

function parseName(text) {
  try {
    return JSON.parse(text).name;
  } catch {
    return text.match(/"name"\s*:\s*"([^"]+)"/)?.[1] || null;
  }
}

async function listPages() {
  return fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
}

const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) =>
  r.json(),
);
const { ws: bws, send: bsend } = await wsRpc(version.webSocketDebuggerUrl);

// Open extensions page + wait for SW registration
await bsend("Target.createTarget", { url: "chrome://extensions/" });
await new Promise((r) => setTimeout(r, 2000));

let list = await listPages();
let sws = list.filter(
  (t) =>
    t.type === "service_worker" &&
    String(t.url || "").includes("chrome-extension://"),
);
console.log(
  "SWs",
  sws.map((s) => s.url),
);

const found = [];
for (const sw of sws) {
  const extId = String(sw.url).match(/chrome-extension:\/\/([^/]+)/)?.[1];
  if (!extId) continue;
  await bsend("Target.createTarget", {
    url: `chrome-extension://${extId}/manifest.json`,
  });
  await new Promise((r) => setTimeout(r, 800));
  list = await listPages();
  const mpage = list.find(
    (p) =>
      String(p.url || "").includes(extId) &&
      String(p.url || "").includes("manifest.json"),
  );
  if (!mpage?.webSocketDebuggerUrl) {
    found.push({ extId, name: null, sw: sw.url });
    continue;
  }
  const { ws, send } = await wsRpc(mpage.webSocketDebuggerUrl);
  await send("Runtime.enable");
  const body = await send("Runtime.evaluate", {
    expression: "document.body.innerText",
    returnByValue: true,
  });
  const text = body.result?.result?.value || "";
  found.push({ extId, name: parseName(text), sw: sw.url });
  ws.close();
}

// Also scan Preferences for unpacked path containing pulse-trezor/extension
console.log("FOUND", JSON.stringify(found, null, 2));
let perchExt = found.find((f) => f.name === "Pulse Perch");

// Fallback: open every chrome-extension://*/background.js we know from load path via management API on extensions page
if (!perchExt) {
  list = await listPages();
  const extPage = list.find(
    (p) => p.type === "page" && String(p.url || "").startsWith("chrome://extensions"),
  );
  if (extPage?.webSocketDebuggerUrl) {
    const { ws, send } = await wsRpc(extPage.webSocketDebuggerUrl);
    await send("Runtime.enable");
    // developerPrivate is not available from page JS; use DOM text scrape
    const scrape = await send("Runtime.evaluate", {
      expression: `document.body.innerText.includes("Pulse Perch")`,
      returnByValue: true,
    });
    console.log("EXT_PAGE_HAS_PERCH", scrape.result?.result?.value);
    ws.close();
  }
}

let dappProbe = null;
let perchProbe = null;
let accountsProbe = null;

if (perchExt) {
  await bsend("Target.createTarget", { url: "http://127.0.0.1:5174/" });
  await new Promise((r) => setTimeout(r, 2000));
  list = await listPages();
  const perchPage = list.find(
    (p) => p.type === "page" && /127\.0\.0\.1:517[34]/.test(p.url || ""),
  );
  if (perchPage?.webSocketDebuggerUrl) {
    const { ws, send } = await wsRpc(perchPage.webSocketDebuggerUrl);
    await send("Runtime.enable");
    await send("Page.reload", { ignoreCache: true });
    await new Promise((r) => setTimeout(r, 2000));
    const probe = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        href: location.href,
        hasBridge: typeof window.__pulsePerchInject,
        ethereum: !!window.ethereum,
        isPulsePerch: !!(window.ethereum && window.ethereum.isPulsePerch)
      })`,
      returnByValue: true,
    });
    perchProbe = JSON.parse(probe.result?.result?.value || "null");
    console.log("PERCH_PROBE", perchProbe);
    ws.close();
  }

  await bsend("Target.createTarget", { url: "https://example.com/" });
  await new Promise((r) => setTimeout(r, 2000));
  list = await listPages();
  const dapp = list.find(
    (p) => p.type === "page" && String(p.url || "").includes("example.com"),
  );
  if (dapp?.webSocketDebuggerUrl) {
    const { ws, send } = await wsRpc(dapp.webSocketDebuggerUrl);
    await send("Runtime.enable");
    await new Promise((r) => setTimeout(r, 1200));
    const probe = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        href: location.href,
        ethereum: !!window.ethereum,
        isPulsePerch: !!(window.ethereum && window.ethereum.isPulsePerch),
        isMetaMask: !!(window.ethereum && window.ethereum.isMetaMask)
      })`,
      returnByValue: true,
    });
    dappProbe = JSON.parse(probe.result?.result?.value || "null");
    console.log("DAPP_PROBE", dappProbe);

    // eth_chainId / accounts without Perch connected → honest fail or empty
    if (dappProbe?.isPulsePerch) {
      const req = await send("Runtime.evaluate", {
        awaitPromise: true,
        expression: `(async () => {
          try {
            const chainId = await window.ethereum.request({ method: "eth_chainId" });
            return JSON.stringify({ ok: true, chainId });
          } catch (e) {
            return JSON.stringify({ ok: false, code: e.code, message: e.message });
          }
        })()`,
        returnByValue: true,
      });
      accountsProbe = JSON.parse(req.result?.result?.value || "null");
      console.log("CHAIN_PROBE", accountsProbe);
    }
    ws.close();
  }
}

const out = {
  ok: !!(perchExt && dappProbe?.isPulsePerch),
  perchExt: perchExt || null,
  found,
  perchProbe,
  dappProbe,
  accountsProbe,
  checklist: {
    extensionLoads: !!perchExt,
    serviceWorker: !!perchExt,
    injectIsPulsePerch: !!dappProbe?.isPulsePerch,
    perchTabBridge:
      perchProbe?.hasBridge === "object" || perchProbe?.hasBridge === "function",
    eth_chainId: accountsProbe?.ok === true ? "PASS" : accountsProbe,
    personalSign: "manual — Connect+Suite",
    typedData: "manual — Connect+Suite",
    sendTx: "manual — needs dust + Connect+Suite",
    badChainReject: "unit: eip1193.test.ts",
    perchClosedFailsHonest: "code: background.js 4100",
  },
};
writeFileSync("tmp-ext-cdp-smoke.json", JSON.stringify(out, null, 2));
console.log(out.ok ? "EXT_SMOKE_OK" : "EXT_SMOKE_PARTIAL");
bws.close();
process.exit(out.ok ? 0 : 1);
