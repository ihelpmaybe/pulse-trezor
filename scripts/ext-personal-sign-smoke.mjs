/**
 * Lab Chrome CDP: personal_sign via inject (desk must already be Connected).
 * Env: CDP_PORT=9233
 * Spawns emu-yes; agent/Suite Confirm still needed on desktop.
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = Number(process.env.CDP_PORT || 9233);
const ROOT = dirname(fileURLToPath(import.meta.url));

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

const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
  (r) => r.json(),
);
const browser = await wsRpc(version.webSocketDebuggerUrl);

let list = await listPages();
let perch = list.find(
  (p) =>
    p.type === "page" &&
    /127\.0\.0\.1:517[34]/.test(p.url || "") &&
    p.webSocketDebuggerUrl,
);
if (!perch) {
  console.error("NO_PERCH");
  browser.ws.close();
  process.exit(1);
}

// Ext reload kills dapp content.js — open a fresh dapp tab so inject+CS are live
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

const connected = await (async () => {
  const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
  await send("Runtime.enable");
  const out = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `([...document.querySelectorAll("button")].some((b) => /Disconnect/i.test(b.textContent || "")))`,
  });
  ws.close();
  return !!out.result?.result?.value;
})();
console.log("DESK_CONNECTED", connected);
if (!connected) {
  console.error("Connect desk first");
  process.exit(1);
}

const emu = spawn(
  "powershell",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    join(ROOT, "emu-yes.ps1"),
    "-Count",
    "12",
    "-DelayMs",
    "1800",
  ],
  { detached: true, stdio: "ignore", windowsHide: true },
);
emu.unref();
console.log("EMU_YES_SPAWNED");

const { ws, send } = await wsRpc(dapp.webSocketDebuggerUrl);
await send("Runtime.enable");

const acctRaw = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    try {
      return await window.ethereum.request({ method: "eth_accounts" });
    } catch (e) {
      return { err: String(e.message || e) };
    }
  })()`,
});
const accounts = acctRaw.result?.result?.value;
console.log("ACCOUNTS", accounts);
const addr = Array.isArray(accounts) ? accounts[0] : null;
if (!addr) {
  console.error("NO_ADDR");
  ws.close();
  process.exit(1);
}

console.log("PERSONAL_SIGN_START");
const signRaw = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    try {
      const sig = await window.ethereum.request({
        method: "personal_sign",
        params: ["0x68656c6c6f", "${addr}"],
      });
      return { ok: true, sig };
    } catch (e) {
      return { ok: false, code: e.code, message: String(e.message || e) };
    }
  })()`,
});
const sign = signRaw.result?.result?.value;
console.log("PERSONAL_SIGN", sign);
ws.close();

const out = { ok: !!(sign?.ok && sign?.sig), accounts, sign };
writeFileSync("tmp-ext-personal-sign.json", JSON.stringify(out, null, 2));
console.log(out.ok ? "EXT_PERSONAL_SIGN_OK" : "EXT_PERSONAL_SIGN_FAIL");
browser.ws.close();
process.exit(out.ok ? 0 : 1);
