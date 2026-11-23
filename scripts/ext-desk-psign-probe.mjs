import WebSocket from "ws";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const expression = [
  "(async () => {",
  "  const inj = window.__pulsePerchInject;",
  "  if (!inj || !inj.request) return { ok: false, why: 'no inject' };",
  "  try {",
  "    const accounts = await inj.request({ method: 'eth_accounts' });",
  "    const addr = accounts && accounts[0];",
  "    if (!addr) return { ok: false, why: 'no addr', accounts: accounts };",
  "    const sig = await inj.request({ method: 'personal_sign', params: ['0x68656c6c6f', addr] });",
  "    return { ok: true, addr: addr, sig: sig };",
  "  } catch (e) {",
  "    return { ok: false, code: e.code, message: String(e.message || e) };",
  "  }",
  "})()",
].join("\n");

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
    "1500",
  ],
  { detached: true, stdio: "ignore", windowsHide: true },
);
emu.unref();

const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const perch = list.find(
  (p) =>
    p.type === "page" &&
    /127\.0\.0\.1:517[34]/.test(p.url || "") &&
    p.webSocketDebuggerUrl,
);
if (!perch) {
  console.log("NO_PERCH");
  process.exit(1);
}

const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
await send("Runtime.enable");
const out = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression,
});
console.log(JSON.stringify(out.result?.result?.value, null, 2));
ws.close();
process.exit(out.result?.result?.value?.ok ? 0 : 1);
