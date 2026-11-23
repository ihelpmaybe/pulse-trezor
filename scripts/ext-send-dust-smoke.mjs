/**
 * Lab Chrome CDP: eth_sendTransaction self-dust via inject (desk Connected, chain 943).
 * Env: CDP_PORT=9233
 * Amount: 0.001 tPLS to self. Testnet only.
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = Number(process.env.CDP_PORT || 9233);
const ROOT = dirname(fileURLToPath(import.meta.url));
const VALUE = "0x38d7ea4c68000";

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
const perch = list.find(
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
  browser.ws.close();
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
    "14",
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
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      return { accounts, chainId };
    } catch (e) {
      return { err: String(e.message || e) };
    }
  })()`,
});
const face = acctRaw.result?.result?.value;
console.log("FACE", face);
const addr = Array.isArray(face?.accounts) ? face.accounts[0] : null;
if (!addr) {
  console.error("NO_ADDR");
  ws.close();
  browser.ws.close();
  process.exit(1);
}
if (String(face.chainId).toLowerCase() !== "0x3af") {
  console.error("WRONG_CHAIN", face.chainId);
  ws.close();
  browser.ws.close();
  process.exit(1);
}

console.log("SEND_START", addr);
const txRaw = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    try {
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: ${JSON.stringify(addr)},
          to: ${JSON.stringify(addr)},
          value: ${JSON.stringify(VALUE)},
          data: "0x",
        }],
      });
      return { ok: true, hash };
    } catch (e) {
      return { ok: false, code: e.code, message: String(e.message || e) };
    }
  })()`,
});
const tx = txRaw.result?.result?.value;
console.log("SEND", tx);
ws.close();

const out = { ok: !!(tx?.ok && tx?.hash), from: addr, value: VALUE, tx };
writeFileSync("tmp-ext-send-dust.json", JSON.stringify(out, null, 2));
console.log(out.ok ? "EXT_SEND_OK" : "EXT_SEND_FAIL");
browser.ws.close();
process.exit(out.ok ? 0 : 1);
