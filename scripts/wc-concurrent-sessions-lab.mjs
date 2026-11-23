/**
 * Two isolated SignClients (child processes) → pair both on Perch Sites.
 * Pass = both topics live + both names on the session list.
 *
 * Env: CDP_PORT=9233 · DESK_URL=http://127.0.0.1:5174/ · REOWN_PROJECT_ID
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.CDP_PORT || 9233);
const DESK = process.env.DESK_URL || "http://127.0.0.1:5174/";
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

function startClient(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(ROOT, "wc-one-client.mjs")],
      {
        env: {
          ...process.env,
          REOWN_PROJECT_ID: projectId,
          WC_NAME: name,
          WC_HOLD_MS: "180000",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let buf = "";
    let uri = null;
    let topic = null;
    const done = { resolve, reject, child };
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() || "";
      for (const line of lines) {
        if (line === "URI_READY") continue;
        if (line.startsWith("wc:") && !uri) {
          uri = line.trim();
          done.onUri?.(uri);
        }
        if (line === "SESSION_OK") continue;
        if (uri && !topic && /^[a-f0-9]{64}$/i.test(line.trim())) {
          topic = line.trim();
          done.onSession?.(topic);
        }
        if (line.startsWith("FAIL")) {
          done.onFail?.(new Error(line));
        }
      }
    });
    child.stderr.on("data", (c) => {
      const t = c.toString();
      if (/already initialized/i.test(t)) return;
      process.stderr.write(t);
    });
    child.on("exit", (code) => {
      if (!topic) done.reject(new Error(`client exit ${code}`));
    });
    resolve({
      child,
      name,
      waitUri: () =>
        new Promise((res, rej) => {
          if (uri) return res(uri);
          const t = setTimeout(() => rej(new Error("uri timeout")), 30_000);
          done.onUri = (u) => {
            clearTimeout(t);
            res(u);
          };
          done.reject = rej;
        }),
      waitSession: () =>
        new Promise((res, rej) => {
          if (topic) return res(topic);
          const t = setTimeout(() => rej(new Error("session timeout")), 90_000);
          done.onSession = (top) => {
            clearTimeout(t);
            res(top);
          };
          done.onFail = (e) => {
            clearTimeout(t);
            rej(e);
          };
        }),
    });
  });
}

async function findPerch() {
  const list = await listPages();
  return list.find(
    (p) =>
      p.type === "page" &&
      /127\.0\.0\.1:517[34]/.test(p.url || "") &&
      p.webSocketDebuggerUrl,
  );
}

async function ensureConnected(perch) {
  const face = await evalOn(
    perch,
    `(() => {
      const btns = [...document.querySelectorAll("button")].map((b) =>
        (b.textContent || "").trim(),
      );
      return { disconnect: btns.some((t) => /Disconnect/i.test(t)) };
    })()`,
  );
  return !!face?.disconnect;
}

async function ensureProjectId(perch) {
  return evalOn(
    perch,
    `(async () => {
      const id = ${JSON.stringify(projectId)};
      try { localStorage.setItem("pulse-desk-reown-project-id", id); } catch {}
      const sites = document.getElementById("perch-tab-sites");
      if (sites) sites.click();
      await new Promise((r) => setTimeout(r, 400));
      const labeled = [...document.querySelectorAll("label")].find((l) =>
        /Reown id/i.test(l.textContent || ""),
      );
      const target = labeled?.querySelector("input");
      if (target) {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(target, id);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const save = [...document.querySelectorAll("button")].find((b) =>
        /^Save$/i.test((b.textContent || "").trim()),
      );
      save?.click();
      return { ok: true, hadField: !!target };
    })()`,
    { awaitPromise: true },
  );
}

async function clearProposalUi(perch) {
  for (let i = 0; i < 16; i++) {
    const r = await evalOn(
      perch,
      `(() => {
        const sites = document.getElementById("perch-tab-sites");
        if (sites) sites.click();
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /^Reject$/i.test((b.textContent || "").trim()),
        );
        if (!btn || btn.disabled) return { cleared: true, i: ${0} };
        btn.click();
        return { cleared: false };
      })()`,
    );
    if (r?.cleared) return i;
    await new Promise((r) => setTimeout(r, 400));
  }
  return 16;
}

async function pairOne(perch, uri, label) {
  const want = `Perch Concurrent ${label}`;
  await clearProposalUi(perch);
  const step = await evalOn(
    perch,
    `(() => {
      const sites = document.getElementById("perch-tab-sites");
      if (sites) sites.click();
      const labeled = [...document.querySelectorAll("label")].find((l) =>
        /Pair URI/i.test(l.textContent || ""),
      );
      const box =
        labeled?.querySelector("textarea") ||
        [...document.querySelectorAll("textarea")].find((el) =>
          /wc/i.test(el.placeholder || ""),
        );
      const pairBtn = [...document.querySelectorAll("button")].find((b) =>
        /Pair site/i.test(b.textContent || ""),
      );
      if (!box) return { ok: false, why: "no uri field" };
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(box, ${JSON.stringify(uri)});
      box.dispatchEvent(new Event("input", { bubbles: true }));
      box.dispatchEvent(new Event("change", { bubbles: true }));
      if (!pairBtn) return { ok: false, why: "no pair button" };
      if (pairBtn.disabled) return { ok: false, why: "pair disabled" };
      pairBtn.click();
      return { ok: true, label: ${JSON.stringify(label)} };
    })()`,
  );
  console.log("PAIR_CLICK", label, step);
  if (!step?.ok) return false;

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const approve = await evalOn(
      perch,
      `(() => {
        const region = [...document.querySelectorAll("[role=region]")].find((el) =>
          /Session request/i.test(el.getAttribute("aria-label") || ""),
        );
        const face = region?.innerText || document.body.innerText;
        const nameOk = ${JSON.stringify(want)}.split(" ").every((p) => face.includes(p))
          || face.includes(${JSON.stringify(want)});
        if (!nameOk) {
          return { found: false, waitingName: true, face: (region?.innerText || "").slice(0, 120) };
        }
        const warn = [...document.querySelectorAll("label")].find((l) =>
          /origin warn/i.test(l.textContent || ""),
        );
        if (warn) {
          const cb = warn.querySelector('input[type="checkbox"]');
          if (cb && !cb.checked) cb.click();
        }
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /Approve session/i.test(b.textContent || ""),
        );
        if (!btn) return { found: false };
        if (btn.disabled) return { found: true, disabled: true };
        btn.click();
        return { found: true, clicked: true, nameOk: true };
      })()`,
    );
    console.log("APPROVE_WAIT", label, i, approve);
    if (approve?.clicked) {
      await new Promise((r) => setTimeout(r, 2500));
      return true;
    }
  }
  return false;
}

async function sessionNames(perch) {
  return evalOn(
    perch,
    `(() => {
      const ul = document.querySelector('[data-testid="wc-sessions"]');
      if (!ul) return [];
      return [...ul.querySelectorAll("[data-wc-session]")].map((li) =>
        li.getAttribute("data-wc-session"),
      );
    })()`,
  );
}

async function dropAllSessions(perch) {
  return evalOn(
    perch,
    `(async () => {
      const sites = document.getElementById("perch-tab-sites");
      if (sites) sites.click();
      await new Promise((r) => setTimeout(r, 300));
      let n = 0;
      for (let i = 0; i < 8; i++) {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /Drop session/i.test(b.getAttribute("aria-label") || ""),
        );
        if (!btn) break;
        btn.click();
        n++;
        await new Promise((r) => setTimeout(r, 600));
      }
      return { dropped: n };
    })()`,
    { awaitPromise: true },
  );
}

const version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
  (r) => r.json(),
);
const browser = await wsRpc(version.webSocketDebuggerUrl);

let perch = await findPerch();
if (!perch) {
  await browser.send("Target.createTarget", { url: DESK });
  await new Promise((r) => setTimeout(r, 2500));
  perch = await findPerch();
}
if (!perch) {
  console.error("NO_PERCH");
  process.exit(1);
}

const connected = await ensureConnected(perch);
console.log("DESK_CONNECTED", connected);
if (!connected) {
  console.error("Connect desk first");
  process.exit(1);
}

console.log("PROJECT_ID", await ensureProjectId(perch));
console.log("DROP_OLD", await dropAllSessions(perch));
console.log("CLEAR_PROPOSALS", await clearProposalUi(perch));

const clientA = await startClient("Perch Concurrent A");
const uriA = await clientA.waitUri();
console.log("URI_A", uriA.slice(0, 40) + "…");
const sessionAPromise = clientA.waitSession().catch((e) => {
  throw e;
});
const okA = await pairOne(perch, uriA, "A");
let topicA = null;
try {
  topicA = await sessionAPromise;
  console.log("SESSION_A", topicA);
} catch (e) {
  console.error("APPROVAL_A_FAIL", e.message || e);
}

const clientB = await startClient("Perch Concurrent B");
const uriB = await clientB.waitUri();
console.log("URI_B", uriB.slice(0, 40) + "…");
const sessionBPromise = clientB.waitSession();
const okB = await pairOne(perch, uriB, "B");
let topicB = null;
try {
  topicB = await sessionBPromise;
  console.log("SESSION_B", topicB);
} catch (e) {
  console.error("APPROVAL_B_FAIL", e.message || e);
}

await new Promise((r) => setTimeout(r, 2000));
perch = (await findPerch()) || perch;
const names = await sessionNames(perch);
console.log("SESSION_NAMES", names);

const bothLive =
  !!topicA &&
  !!topicB &&
  topicA !== topicB &&
  Array.isArray(names) &&
  names.length >= 2 &&
  names.some((n) => /Concurrent A/i.test(n || "")) &&
  names.some((n) => /Concurrent B/i.test(n || ""));

const out = {
  ok: bothLive,
  pairClicks: { a: okA, b: okB },
  topics: { a: topicA, b: topicB },
  names,
};
writeFileSync("tmp-wc-concurrent.json", JSON.stringify(out, null, 2));
console.log(bothLive ? "WC_CONCURRENT_OK" : "WC_CONCURRENT_FAIL");

try {
  clientA.child.kill();
} catch {
  /* ignore */
}
try {
  clientB.child.kill();
} catch {
  /* ignore */
}
browser.ws.close();
process.exit(bothLive ? 0 : 1);
