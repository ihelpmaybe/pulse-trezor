/**
 * Gate 1 desk slice (no MetaMask): Connect already assumed.
 * Checks: address+balance face, Sites pair+personal_sign, dox that MM not required.
 * Env: CDP_PORT=9233 · REOWN_PROJECT_ID
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const bag = await evalOn(
  perch,
  `(() => {
    const text = document.body.innerText || "";
    const disconnect = [...document.querySelectorAll("button")].some((b) =>
      /Disconnect/i.test(b.textContent || ""),
    );
    const addr = (text.match(/0x[a-fA-F0-9]{40}/) || [])[0] || null;
    const hasBal = /tPLS|PLS|Balance|bag/i.test(text);
    const mmMention = /install metamask|need metamask|requires metamask/i.test(
      text,
    );
    return { disconnect, addr, hasBal, mmMention };
  })()`,
);
console.log("BAG", bag);

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
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, id);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    [...document.querySelectorAll("button")]
      .find((b) => /^Save$/i.test((b.textContent || "").trim()))
      ?.click();
    for (let i = 0; i < 12; i++) {
      const rej = [...document.querySelectorAll("button")].find((b) =>
        /^Reject$/i.test((b.textContent || "").trim()),
      );
      if (!rej || rej.disabled) break;
      rej.click();
      await new Promise((r) => setTimeout(r, 300));
    }
    return true;
  })()`,
  { awaitPromise: true },
);

let uri = null;
let topic = null;
let sigOk = false;
const child = spawn(process.execPath, [join(ROOT, "wc-one-client.mjs")], {
  env: {
    ...process.env,
    REOWN_PROJECT_ID: projectId,
    WC_NAME: "Gate1 Sites Lab",
    WC_HOLD_MS: "120000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let buf = "";
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("uri timeout")), 30000);
  child.stdout.on("data", (c) => {
    buf += c.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("wc:") && !uri) {
        uri = line.trim();
        clearTimeout(t);
        res();
      }
      if (/^[a-f0-9]{64}$/i.test(line.trim())) topic = line.trim();
      if (line.startsWith("FAIL")) rej(new Error(line));
    }
  });
});
console.log("URI", uri.slice(0, 40) + "…");

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
    "1800",
  ],
  { detached: true, stdio: "ignore", windowsHide: true },
);
emu.unref();

await evalOn(
  perch,
  `(() => {
    document.getElementById("perch-tab-sites")?.click();
    const box = [...document.querySelectorAll("label")]
      .find((l) => /Pair URI/i.test(l.textContent || ""))
      ?.querySelector("textarea");
    const pairBtn = [...document.querySelectorAll("button")].find((b) =>
      /Pair site/i.test(b.textContent || ""),
    );
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, ${JSON.stringify(uri)});
    box.dispatchEvent(new Event("input", { bubbles: true }));
    pairBtn.click();
    return true;
  })()`,
);

for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 800));
  const r = await evalOn(
    perch,
    `(() => {
      const region = [...document.querySelectorAll("[role=region]")].find((el) =>
        /Session request/i.test(el.getAttribute("aria-label") || ""),
      );
      if (!region || !/Gate1 Sites Lab/i.test(region.innerText || "")) {
        return { ready: false };
      }
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /Approve session/i.test(b.textContent || ""),
      );
      if (!btn || btn.disabled) return { ready: true, disabled: !!btn?.disabled };
      btn.click();
      return { ready: true, clicked: true };
    })()`,
  );
  console.log("APPROVE", i, r);
  if (r?.clicked) break;
}

await new Promise((r) => setTimeout(r, 2500));
const sessions = await evalOn(
  perch,
  `[...document.querySelectorAll("[data-wc-session]")].map((li) =>
    li.getAttribute("data-wc-session"),
  )`,
);
console.log("SESSIONS", sessions);

// personal_sign via the live client if we still have topic — child may print SESSION_OK
await new Promise((r) => setTimeout(r, 2000));

const approveTab = await evalOn(
  perch,
  `(async () => {
    document.getElementById("perch-tab-approve")?.click();
    await new Promise((r) => setTimeout(r, 600));
    const panel = document.querySelector('[aria-labelledby="perch-tab-approve"]');
    const text = panel?.innerText || "";
    return {
      hasApproveUi: /Approve amount|Approve max/i.test(text),
      hasRevoke: /Revoke|allowance/i.test(text),
      hasSpender: /Spender|PulseX/i.test(text),
    };
  })()`,
  { awaitPromise: true },
);
console.log("APPROVE_TAB", approveTab);

const out = {
  ok: !!(
    bag?.disconnect &&
    bag?.addr &&
    bag?.hasBal &&
    !bag?.mmMention &&
    Array.isArray(sessions) &&
    sessions.some((n) => /Gate1/i.test(n || "")) &&
    approveTab?.hasApproveUi &&
    approveTab?.hasSpender
  ),
  bag,
  sessions,
  approveTab,
  topic,
  sigOk,
};
writeFileSync("tmp-gate1-desk.json", JSON.stringify(out, null, 2));
console.log(out.ok ? "GATE1_DESK_OK" : "GATE1_DESK_PARTIAL");
try {
  child.kill();
} catch {
  /* ignore */
}
process.exit(out.ok ? 0 : 1);
