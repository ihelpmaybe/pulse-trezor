import WebSocket from "ws";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.CDP_PORT || 9233);
const ROOT = dirname(fileURLToPath(import.meta.url));

const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const perch = list.find(
  (p) => /5174/.test(p.url || "") && p.webSocketDebuggerUrl,
);
if (!perch) {
  console.error("NO_PERCH");
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
    "10",
    "-DelayMs",
    "1500",
  ],
  { detached: true, stdio: "ignore", windowsHide: true },
);
emu.unref();

const ws = new WebSocket(perch.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.on("open", res);
  ws.on("error", rej);
});
let id = 0;
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    const h = (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.id === i) {
        ws.off("message", h);
        r(m);
      }
    };
    ws.on("message", h);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await send("Runtime.enable");

const start = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const disc = [...document.querySelectorAll("button")].some((b) =>
      /Disconnect/i.test(b.textContent || ""),
    );
    if (disc) return { already: true };
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /Connect #1|Connect Trezor|Load \\d+ accounts/i.test(b.textContent || ""),
    );
    // Prefer Connect #1 only for speed
    const one = [...document.querySelectorAll("button")].find((b) =>
      /Connect #1/i.test(b.textContent || ""),
    );
    (one || btn)?.click();
    return { clicked: (one || btn)?.textContent?.trim() || null };
  })()`,
});
console.log("START", start.result?.result?.value);

let face = null;
for (let i = 0; i < 45; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const snap = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const text = document.body.innerText || "";
      const connected = [...document.querySelectorAll("button")].some((b) =>
        /Disconnect/i.test(b.textContent || ""),
      );
      const header = (text.match(/●[^\\n]+/) || [])[0] || null;
      const alerts = [...document.querySelectorAll("[role=alert], .err, .error")]
        .map((e) => (e.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 5);
      return { connected, header, alerts };
    })()`,
  });
  face = snap.result?.result?.value;
  console.log("WAIT", i, face);
  if (face?.connected) break;
}
ws.close();
console.log(face?.connected ? "RECONNECT_OK" : "RECONNECT_FAIL");
process.exit(face?.connected ? 0 : 1);
