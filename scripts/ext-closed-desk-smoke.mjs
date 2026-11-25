/**
 * Lab Chrome CDP: with the Perch desk tab closed, silent inject calls
 * must NOT open a new desk tab.
 * - No live desk/offscreen: eth_accounts → [] (not a connected wallet)
 * - After Connect (0.1.5+): eth_chainId may use storage hint; eth_accounts stays [] unless offscreen answers
 * eth_requestAccounts may open desk — this smoke does not call that.
 * Reload the extension first so background.js is current.
 * Env: CDP_PORT=9233
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";

const PORT = Number(process.env.CDP_PORT || 9233);

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

function isPerch(p) {
  return (
    p.type === "page" &&
    (/127\.0\.0\.1:517[34]/.test(p.url || "") ||
      /localhost:517[34]/.test(p.url || ""))
  );
}

const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
  (r) => r.json(),
);
const browser = await wsRpc(version.webSocketDebuggerUrl);

let list = await listPages();
for (const p of list) {
  if (p.type === "page" && String(p.url || "").includes("example.com") && p.id) {
    try {
      await browser.send("Target.closeTarget", { targetId: p.id });
    } catch {
      /* ignore */
    }
  }
}
await browser.send("Target.createTarget", { url: "https://example.com/" });
await new Promise((r) => setTimeout(r, 2500));

list = await listPages();
const dapp = list.find(
  (p) =>
    p.type === "page" &&
    String(p.url || "").includes("example.com") &&
    p.webSocketDebuggerUrl,
);
if (!dapp) {
  console.error("NO_DAPP");
  browser.ws.close();
  process.exit(1);
}

const closed = [];
for (const p of list) {
  if (isPerch(p) && p.id) {
    try {
      await browser.send("Target.closeTarget", { targetId: p.id });
      closed.push(p.id);
    } catch {
      /* ignore */
    }
  }
}
console.log("CLOSED_DESK", closed.length);
await new Promise((r) => setTimeout(r, 800));

const { ws, send } = await wsRpc(dapp.webSocketDebuggerUrl);
await send("Runtime.enable");
const raw = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const out = { isPulsePerch: !!(window.ethereum && window.ethereum.isPulsePerch) };
    try {
      out.chainId = await window.ethereum.request({ method: "eth_chainId" });
      out.chainOk = true;
    } catch (e) {
      out.chainOk = false;
      out.chainCode = e.code;
      out.chainMessage = String(e.message || e);
    }
    try {
      out.accounts = await window.ethereum.request({ method: "eth_accounts" });
      out.accountsOk = true;
    } catch (e) {
      out.accountsOk = false;
      out.accountsCode = e.code;
      out.accountsMessage = String(e.message || e);
    }
    return out;
  })()`,
});
const probe = raw.result?.result?.value;
console.log("PROBE", probe);
ws.close();

await new Promise((r) => setTimeout(r, 1500));
const after = await listPages();
const reopened = after.filter(isPerch).map((p) => p.url);
console.log("REOPENED", reopened);

const noSpawn = reopened.length === 0;
const failClosed =
  probe?.chainOk === false &&
  probe?.chainCode === 4100 &&
  probe?.accountsOk === false &&
  probe?.accountsCode === 4100;
const cachedOk =
  probe?.chainOk === true &&
  probe?.accountsOk === true &&
  Array.isArray(probe?.accounts);
const honest =
  probe?.isPulsePerch === true &&
  noSpawn &&
  (failClosed || cachedOk);

const result = { ok: honest, closed: closed.length, probe, reopened };
writeFileSync("tmp-ext-closed-desk.json", JSON.stringify(result, null, 2));
console.log(honest ? "EXT_CLOSED_DESK_OK" : "EXT_CLOSED_DESK_FAIL");
browser.ws.close();
process.exit(honest ? 0 : 1);
