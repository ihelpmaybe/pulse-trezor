import WebSocket from "ws";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.CDP_PORT || 9233);
const EXT = resolve(
  process.env.EXT_DIR ||
    join(dirname(fileURLToPath(import.meta.url)), "..", "extension"),
);

function wsRpc(url) {
  return new Promise((resolveP, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.on("open", () => {
      resolveP({
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

const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) =>
  r.json(),
);
const browser = await wsRpc(version.webSocketDebuggerUrl);
await browser.send("Target.createTarget", { url: "chrome://extensions/" });
await new Promise((r) => setTimeout(r, 2000));
const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const page = list.find(
  (p) =>
    String(p.url || "").startsWith("chrome://extensions") &&
    p.webSocketDebuggerUrl,
);
const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
await send("Runtime.enable");

const pathJson = JSON.stringify(EXT);
const out = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const api = chrome.developerPrivate;
    if (!api) return { ok: false, why: "no developerPrivate" };
    const call = (fn, args) =>
      new Promise((res, rej) => {
        try {
          fn(...args, (result) => {
            const err = chrome.runtime && chrome.runtime.lastError;
            if (err) rej(new Error(err.message || String(err)));
            else res(result);
          });
        } catch (e) {
          rej(e);
        }
      });
    try {
      // Modern Chrome: loadUnpacked(options) opens dialog — use choosePath + retryGuid flow if needed.
      // Try loadUnpacked with empty options (dialog), else choosePath FOLDER+LOAD.
      let result = null;
      let via = null;
      try {
        result = await call(api.loadUnpacked.bind(api), [{ failQuietly: false, populateError: true }]);
        via = "loadUnpacked-options";
      } catch (e1) {
        try {
          const chosen = await call(api.choosePath.bind(api), [
            api.SelectType.FOLDER,
            api.FileType.LOAD,
          ]);
          result = { chosen };
          via = "choosePath";
          // After choosePath, loadUnpacked retry with guid if present
          if (chosen && typeof chosen === "string") {
            try {
              result = await call(api.loadUnpacked.bind(api), [
                { failQuietly: false, populateError: true },
              ]);
              via = "choosePath+loadUnpacked";
            } catch (e2) {
              result = { chosen, loadErr: String(e2.message || e2) };
            }
          }
        } catch (e3) {
          return {
            ok: false,
            err1: String(e1.message || e1),
            err3: String(e3.message || e3),
            wantPath: ${pathJson},
          };
        }
      }
      const info = await call(api.getExtensionsInfo.bind(api), []);
      const names = (info || []).map((x) => ({
        name: x.name,
        id: x.id,
        location: x.location,
      }));
      return { ok: names.some((n) => /Pulse Perch/i.test(n.name || "")), via, result, names };
    } catch (e) {
      return { ok: false, err: String(e.message || e) };
    }
  })()`,
});
console.log(JSON.stringify(out.result?.result?.value ?? out, null, 2));
ws.close();
browser.ws.close();
