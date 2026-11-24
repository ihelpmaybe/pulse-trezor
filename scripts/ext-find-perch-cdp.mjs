/** Find Pulse Perch in lab Chrome via CDP + Preferences. Env: CDP_PORT */
import WebSocket from "ws";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const pages = list.filter(
  (p) =>
    p.type === "page" &&
    String(p.url || "").startsWith("chrome://extensions") &&
    p.webSocketDebuggerUrl,
);
console.log("ext_pages", pages.length);

let found = false;
for (const page of pages.slice(0, 4)) {
  const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
  await send("Runtime.enable");
  const r = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const t = document.body?.innerText || "";
      return {
        hasPerch: /Pulse Perch/i.test(t),
        version: (t.match(/Version\\s+([0-9.]+)/i) || [])[1] || null,
        snippet: t.replace(/\\s+/g, " ").slice(0, 600),
      };
    })()`,
  });
  const v = r.result?.result?.value;
  console.log("PAGE", JSON.stringify(v));
  if (v?.hasPerch) found = true;
  ws.close();
}

const pref = join(
  process.cwd(),
  "tmp-chrome-ext-lab2",
  "Default",
  "Preferences",
);
if (existsSync(pref)) {
  const p = JSON.parse(readFileSync(pref, "utf8"));
  const rows = Object.entries(p.extensions?.settings || {}).map(([id, e]) => ({
    id,
    name: e?.manifest?.name,
    path: e?.path,
    state: e?.state,
    loc: e?.location,
  }));
  console.log("PREFS", JSON.stringify(rows, null, 2));
  if (rows.some((r) => /Pulse Perch/i.test(r.name || ""))) found = true;
} else {
  console.log("NO_LAB2_PREFS");
}

console.log(found ? "PERCH_PRESENT" : "PERCH_MISSING_IN_LAB_CHROME");
process.exit(found ? 0 : 2);
