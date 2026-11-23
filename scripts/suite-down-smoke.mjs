/**
 * Pen row: Quit Suite mid-session → honest face (no green Suite + “down” contradiction).
 * Restarts Suite when done.
 * Env: CDP_PORT=9233  SKIP_RESTART=1
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";
import { spawn, execSync } from "node:child_process";

const PORT = Number(process.env.CDP_PORT || 9233);
const SUITE_EXE =
  process.env.SUITE_EXE ||
  `${process.env.LOCALAPPDATA}\\Programs\\Trezor Suite\\Trezor Suite.exe`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function suiteWsOk() {
  return new Promise((resolve) => {
    let settled = false;
    const ws = new WebSocket("ws://127.0.0.1:21335/connect-ws");
    const t = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.terminate();
      } catch {
        /* */
      }
      resolve(false);
    }, 1500);
    ws.on("open", () => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      ws.close();
      resolve(true);
    });
    ws.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      resolve(false);
    });
  });
}

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

async function face(send) {
  const snap = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const text = document.body.innerText || "";
      const suiteChip = /·\\s*Suite\\b/i.test(text) && !/Suite not|Suite missing|open Suite/i.test(text.slice(0, 400));
      const header = (text.match(/●[^\\n]+|○[^\\n]+|Suite[^\\n]{0,40}/) || [])[0] || null;
      const alerts = [...document.querySelectorAll("[role=alert], .err, .error, .warn-line")]
        .map((e) => (e.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 8);
      const connectBtn = [...document.querySelectorAll("button")].find((b) =>
        /Connect|Load \\d+ accounts|Disconnect/i.test(b.textContent || ""),
      );
      return {
        header,
        suiteChip,
        alerts,
        connectLabel: (connectBtn?.textContent || "").trim() || null,
        snip: text.slice(0, 500),
      };
    })()`,
  });
  return snap.result?.result?.value;
}

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

const beforeWs = await suiteWsOk();
const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
await send("Runtime.enable");
const before = await face(send);
console.log("BEFORE", { beforeWs, before });

if (!beforeWs) {
  writeFileSync(
    "tmp-suite-down.json",
    JSON.stringify({ ok: false, why: "Suite WS already down", before }, null, 2),
  );
  ws.close();
  process.exit(1);
}

console.log("KILL_SUITE");
try {
  execSync(
    'powershell -NoProfile -Command "Get-Process \'Trezor Suite\' -ErrorAction SilentlyContinue | Stop-Process -Force"',
    { stdio: "inherit" },
  );
} catch (e) {
  console.warn("kill warn", e.message);
}

let afterKillWs = true;
for (let i = 0; i < 20; i++) {
  await sleep(500);
  afterKillWs = await suiteWsOk();
  if (!afterKillWs) break;
}
console.log("AFTER_KILL_WS", afterKillWs);

// Wait for face probe to flip
let mid = null;
for (let i = 0; i < 30; i++) {
  await sleep(1000);
  mid = await face(send);
  console.log("MID", i, mid?.header, mid?.suiteChip, mid?.alerts);
  if (!mid?.suiteChip) break;
}

// Force a Suite-touching action: Disconnect then Connect, or Load accounts
const action = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const btn = (re) =>
      [...document.querySelectorAll("button")].find((b) =>
        re.test(b.textContent || ""),
      );
    const disc = btn(/Disconnect/i);
    if (disc) {
      disc.click();
      await sleep(600);
    }
    const connect = btn(/Connect|Load \\d+ accounts/i);
    if (!connect) return { ok: false, why: "no connect" };
    connect.click();
    await sleep(2500);
    const text = document.body.innerText || "";
    const alerts = [...document.querySelectorAll("[role=alert], .err, .error")]
      .map((e) => (e.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 8);
    const header = (text.match(/●[^\\n]+|○[^\\n]+|Suite[^\\n]{0,40}/) || [])[0] || null;
    const suiteChip = /·\\s*Suite\\b/i.test(text.slice(0, 350));
    return { ok: true, clicked: (connect.textContent || "").trim(), header, suiteChip, alerts, snip: text.slice(0, 700) };
  })()`,
});
const acted = action.result?.result?.value;
console.log("ACTION", acted);

await sleep(2000);
const after = await face(send);
console.log("AFTER", after);

const alertBlob = [...(acted?.alerts || []), ...(after?.alerts || []), after?.snip || "", acted?.snip || ""]
  .join("\n")
  .toLowerCase();
const honestDown =
  /suite not reachable|could not reach suite|open suite|open trezor suite|websocket|not reachable/i.test(
    alertBlob + (after?.header || "") + (acted?.header || ""),
  ) ||
  (!after?.suiteChip && !afterKillWs);

const contradiction =
  after?.suiteChip === true &&
  /suite not reachable|could not reach suite|trezor suite not reachable/i.test(
    alertBlob,
  );

const pass = !afterKillWs && honestDown && !contradiction;

let restart = null;
if (process.env.SKIP_RESTART !== "1") {
  console.log("RESTART_SUITE", SUITE_EXE);
  try {
    spawn(SUITE_EXE, [], { detached: true, stdio: "ignore" }).unref();
    for (let i = 0; i < 40; i++) {
      await sleep(1000);
      if (await suiteWsOk()) {
        restart = { ok: true, waitedSec: i + 1 };
        break;
      }
    }
    if (!restart) restart = { ok: false, why: "WS not back" };
  } catch (e) {
    restart = { ok: false, why: e.message };
  }
  console.log("RESTART", restart);
}

const out = {
  ok: pass,
  beforeWs,
  afterKillWs,
  before,
  mid,
  acted,
  after,
  contradiction,
  honestDown,
  restart,
};
writeFileSync("tmp-suite-down.json", JSON.stringify(out, null, 2));
ws.close();
console.log(pass ? "SUITE_DOWN_OK" : "SUITE_DOWN_FAIL");
process.exit(pass ? 0 : 1);
