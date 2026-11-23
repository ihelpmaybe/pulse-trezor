/**
 * Lab Chrome CDP: eth_signTypedData_v4 via inject (desk already Connected).
 * Env: CDP_PORT=9233
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
  browser.ws.close();
  process.exit(1);
}

const typed = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
    ],
    Mail: [{ name: "contents", type: "string" }],
  },
  primaryType: "Mail",
  domain: { name: "Pulse Perch", version: "1", chainId: 943 },
  message: { contents: "EIP-712 ext inject smoke" },
};

console.log("TYPED_START");
const signRaw = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    try {
      const sig = await window.ethereum.request({
        method: "eth_signTypedData_v4",
        params: [${JSON.stringify(addr)}, ${JSON.stringify(JSON.stringify(typed))}],
      });
      return { ok: true, sig };
    } catch (e) {
      return { ok: false, code: e.code, message: String(e.message || e) };
    }
  })()`,
});
const sign = signRaw.result?.result?.value;
console.log("TYPED", sign);
ws.close();

const out = { ok: !!(sign?.ok && sign?.sig), accounts, typed, sign };
writeFileSync("tmp-ext-typed-data.json", JSON.stringify(out, null, 2));
console.log(out.ok ? "EXT_TYPED_OK" : "EXT_TYPED_FAIL");
browser.ws.close();
process.exit(out.ok ? 0 : 1);
