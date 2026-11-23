/**
 * Pair a single WC client on Perch Sites — prove Approve still works.
 * Env: CDP_PORT=9233
 */
import WebSocket from "ws";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const PORT = Number(process.env.CDP_PORT || 9233);
const projectId =
  process.env.REOWN_PROJECT_ID || "eb3cea87fdb235c24fbdf42761c00e63";
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

async function evalOn(page, expression, { awaitPromise = false } = {}) {
  const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
  await send("Runtime.enable");
  const out = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise,
  });
  ws.close();
  return out.result?.result?.value;
}

const list = await listPages();
const perch = list.find(
  (p) => p.type === "page" && /5174/.test(p.url || "") && p.webSocketDebuggerUrl,
);
if (!perch) {
  console.error("NO_PERCH");
  process.exit(1);
}

const connected = await evalOn(
  perch,
  `([...document.querySelectorAll("button")].some((b) => /Disconnect/i.test(b.textContent || "")))`,
);
console.log("CONNECTED", connected);
if (!connected) {
  console.error("Connect first");
  process.exit(1);
}

await evalOn(
  perch,
  `(async () => {
    const id = ${JSON.stringify(projectId)};
    localStorage.setItem("pulse-desk-reown-project-id", id);
    document.getElementById("perch-tab-sites")?.click();
    await new Promise((r) => setTimeout(r, 300));
    const labeled = [...document.querySelectorAll("label")].find((l) =>
      /Reown id/i.test(l.textContent || ""),
    );
    const input = labeled?.querySelector("input");
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, id);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    [...document.querySelectorAll("button")]
      .find((b) => /^Save$/i.test((b.textContent || "").trim()))
      ?.click();
    for (let i = 0; i < 20; i++) {
      const rej = [...document.querySelectorAll("button")].find((b) =>
        /^Reject$/i.test((b.textContent || "").trim()),
      );
      if (!rej || rej.disabled) break;
      rej.click();
      await new Promise((r) => setTimeout(r, 350));
    }
    return true;
  })()`,
  { awaitPromise: true },
);

let uri = null;
let topic = null;
const child = spawn(process.execPath, [join(ROOT, "wc-one-client.mjs")], {
  env: {
    ...process.env,
    REOWN_PROJECT_ID: projectId,
    WC_NAME: "Perch Pair One",
    WC_HOLD_MS: "60000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let buf = "";
const uriP = new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("uri timeout")), 30000);
  child.stdout.on("data", (c) => {
    buf += c.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";
    for (const line of lines) {
      console.log("CHILD", line);
      if (line.startsWith("wc:") && !uri) {
        uri = line.trim();
        clearTimeout(t);
        res(uri);
      }
      if (/^[a-f0-9]{64}$/i.test(line.trim())) topic = line.trim();
      if (line.startsWith("FAIL")) rej(new Error(line));
    }
  });
});

uri = await uriP;
console.log("URI", uri.slice(0, 48));

await evalOn(
  perch,
  `(() => {
    document.getElementById("perch-tab-sites")?.click();
    const labeled = [...document.querySelectorAll("label")].find((l) =>
      /Pair URI/i.test(l.textContent || ""),
    );
    const box = labeled?.querySelector("textarea");
    const pairBtn = [...document.querySelectorAll("button")].find((b) =>
      /Pair site/i.test(b.textContent || ""),
    );
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    setter?.call(box, ${JSON.stringify(uri)});
    box.dispatchEvent(new Event("input", { bubbles: true }));
    pairBtn.click();
    return { disabled: pairBtn.disabled };
  })()`,
);

for (let i = 0; i < 25; i++) {
  await new Promise((r) => setTimeout(r, 800));
  const face = await evalOn(
    perch,
    `(() => {
      const region = [...document.querySelectorAll("[role=region]")].find((el) =>
        /Session request/i.test(el.getAttribute("aria-label") || ""),
      );
      const text = region?.innerText || "";
      const nameOk = /Perch Pair One/i.test(text);
      if (!nameOk) return { nameOk: false, text: text.slice(0, 160) };
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /Approve session/i.test(b.textContent || ""),
      );
      if (!btn || btn.disabled) return { nameOk: true, disabled: !!btn?.disabled };
      btn.click();
      return { nameOk: true, clicked: true };
    })()`,
  );
  console.log("WAIT", i, face);
  if (face?.clicked) break;
}

await new Promise((r) => setTimeout(r, 3000));
const after = await evalOn(
  perch,
  `({
    sessions: [...document.querySelectorAll("[data-wc-session]")].map((li) =>
      li.getAttribute("data-wc-session"),
    ),
    alerts: [...document.querySelectorAll("[role=alert]")].map((e) =>
      (e.textContent || "").trim(),
    ).slice(0, 5),
    info: [...document.querySelectorAll(".muted, [role=status]")].map((e) =>
      (e.textContent || "").trim(),
    ).filter((t) => /session|pair|error|signed|expired|matching/i.test(t)).slice(0, 8),
  })`,
);
console.log("AFTER", after);
writeFileSync("tmp-wc-pair-one.json", JSON.stringify({ uri, topic, after }, null, 2));
try {
  child.kill();
} catch {
  /* ignore */
}
process.exit(after?.sessions?.some((n) => /Pair One/i.test(n || "")) ? 0 : 1);
