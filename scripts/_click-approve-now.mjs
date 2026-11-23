import WebSocket from "ws";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

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
    "16",
    "-DelayMs",
    "1200",
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

const click = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const wpls = [...document.querySelectorAll("button.tok")].find((b) =>
      /WPLS/i.test(b.textContent || ""),
    );
    wpls?.click();
    await sleep(300);
    document.getElementById("perch-tab-approve")?.click();
    await sleep(400);
    const panel = document.getElementById("perch-panel-approve");
    const chip = [...(panel?.querySelectorAll("button") || [])].find((b) =>
      /PulseX V2/i.test(b.textContent || ""),
    );
    chip?.click();
    const amtLabel = [...(panel?.querySelectorAll("label") || [])].find((l) =>
      /Amount/i.test(l.textContent || ""),
    );
    const amt = amtLabel?.querySelector("input");
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (amt) {
      setter?.call(amt, "1");
      amt.dispatchEvent(new Event("input", { bubbles: true }));
      amt.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await sleep(250);
    const btn = [...(panel?.querySelectorAll("button") || [])].find((b) =>
      /Approve amount/i.test(b.textContent || ""),
    );
    if (!btn || btn.disabled) {
      return {
        ok: false,
        why: "disabled",
        token: (panel?.innerText || "").match(/Token:[\\s\\S]{0,40}/)?.[0],
        amt: amt?.value,
        spender: panel?.querySelector('input[placeholder*="0x"]')?.value,
      };
    }
    btn.click();
    return {
      ok: true,
      token: (panel?.innerText || "").match(/Token:[\\s\\S]{0,40}/)?.[0],
      amt: amt?.value,
      spender: panel?.querySelector('input[placeholder*="0x"]')?.value,
    };
  })()`,
});
const start = click.result?.result?.value;
console.log("CLICK", start);
if (!start?.ok) {
  writeFileSync("tmp-gate1-approve.json", JSON.stringify({ ok: false, start }, null, 2));
  ws.close();
  process.exit(1);
}

let face = null;
for (let i = 0; i < 80; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const snap = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const text = document.body.innerText || "";
      const tx = (text.match(/0x[a-fA-F0-9]{64}/) || [])[0] || null;
      const alerts = [...document.querySelectorAll("[role=alert], .err, .error")]
        .map((e) => (e.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 8);
      const confirm = /Confirm on Trezor/i.test(text);
      const err = alerts.find((a) =>
        /fail|error|reject|invalid|mainnet only|cancelled|canceled/i.test(a),
      );
      return { tx, alerts, confirm, err: err || null };
    })()`,
  });
  face = snap.result?.result?.value;
  console.log("WAIT", i, face);
  if (face?.tx || face?.err) break;
}

ws.close();
const ok = !!face?.tx;
writeFileSync(
  "tmp-gate1-approve.json",
  JSON.stringify({ ok, start, face }, null, 2),
);
console.log(ok ? "GATE1_APPROVE_OK" : "GATE1_APPROVE_FAIL");
process.exit(ok ? 0 : 1);
