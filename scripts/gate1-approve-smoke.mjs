/**
 * Desk Approve tab → import testnet WPLS → Approve amount via CDP + emu YES.
 * Env: CDP_PORT=9233
 */
import WebSocket from "ws";
import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.CDP_PORT || 9233);
const ROOT = dirname(fileURLToPath(import.meta.url));
/** PulseChain Testnet V4 WPLS — from ERC20-SEND-2026-11-22 */
const WPLS_943 = "0x70499adEBB11Efd915E3b69E700c331778628707";

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
const perch = list.find(
  (p) => p.type === "page" && /5174/.test(p.url || "") && p.webSocketDebuggerUrl,
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
    "14",
    "-DelayMs",
    "1800",
  ],
  { detached: true, stdio: "ignore", windowsHide: true },
);
emu.unref();

const { ws, send } = await wsRpc(perch.webSocketDebuggerUrl);
await send("Runtime.enable");

const prep = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const connected = [...document.querySelectorAll("button")].some((b) =>
      /Disconnect/i.test(b.textContent || ""),
    );
    if (!connected) return { ok: false, why: "not connected" };

    // Ensure testnet
    const netSel = [...document.querySelectorAll("select")].find((s) =>
      [...s.options].some((o) => /Testnet/i.test(o.textContent || "")),
    );
    if (netSel && netSel.value !== "943") {
      netSel.value = "943";
      netSel.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(800);
    }

    // Import WPLS if missing
    let wplsBtn = [...document.querySelectorAll("button.tok")].find((b) =>
      /WPLS/i.test(b.textContent || ""),
    );
    if (!wplsBtn) {
      const details = [...document.querySelectorAll("details")].find((d) =>
        /Import token/i.test(d.querySelector("summary")?.textContent || ""),
      );
      if (!details) return { ok: false, why: "no import UI" };
      details.open = true;
      await sleep(200);
      const contractLabel = [...details.querySelectorAll("label")].find((l) =>
        /Contract/i.test(l.textContent || ""),
      );
      const input = contractLabel?.querySelector("input");
      if (!input) return { ok: false, why: "no contract input" };
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "${WPLS_943}");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const addBtn = [...details.querySelectorAll("button")].find((b) =>
        /^Add$/i.test((b.textContent || "").trim()),
      );
      if (!addBtn || addBtn.disabled) {
        return { ok: false, why: "add disabled", val: input.value };
      }
      addBtn.click();
      for (let i = 0; i < 20; i++) {
        await sleep(400);
        wplsBtn = [...document.querySelectorAll("button.tok")].find((b) =>
          /WPLS/i.test(b.textContent || ""),
        );
        if (wplsBtn) break;
      }
    }
    if (!wplsBtn) return { ok: false, why: "WPLS not on face after import" };
    wplsBtn.click();
    await sleep(400);

    document.getElementById("perch-tab-approve")?.click();
    await sleep(600);
    const panel = document.getElementById("perch-panel-approve");
    if (!panel) return { ok: false, why: "no approve panel" };

    const chip = [...panel.querySelectorAll("button")].find((b) =>
      /PulseX V2/i.test(b.textContent || ""),
    );
    chip?.click();
    await sleep(200);

    const amtLabel = [...panel.querySelectorAll("label")].find((l) =>
      /Amount/i.test(l.textContent || ""),
    );
    const amtInput = amtLabel?.querySelector("input");
    if (amtInput) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(amtInput, "1");
      amtInput.dispatchEvent(new Event("input", { bubbles: true }));
      amtInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await sleep(300);

    const tokenLine = (panel.innerText || "").match(/Token:[\\s\\S]{0,60}/)?.[0];
    const spenderInput = panel.querySelector('input[placeholder*="0x"]');
    const btn = [...panel.querySelectorAll("button")].find((b) =>
      /Approve amount/i.test(b.textContent || ""),
    );
    return {
      ok: true,
      tokenLine,
      spender: spenderInput?.value || null,
      amt: amtInput?.value || null,
      approveDisabled: btn?.disabled ?? null,
      wplsOn: wplsBtn.classList.contains("on"),
    };
  })()`,
});
const prepVal = prep.result?.result?.value;
console.log("PREP", prepVal);
if (!prepVal?.ok) {
  writeFileSync(
    "tmp-gate1-approve.json",
    JSON.stringify({ ok: false, prep: prepVal }, null, 2),
  );
  ws.close();
  process.exit(1);
}

if (prepVal.approveDisabled) {
  // Retry click asset + approve once more
  const retry = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const wplsBtn = [...document.querySelectorAll("button.tok")].find((b) =>
        /WPLS/i.test(b.textContent || ""),
      );
      wplsBtn?.click();
      await sleep(500);
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
      const amtInput = amtLabel?.querySelector("input");
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      if (amtInput) {
        setter?.call(amtInput, "1");
        amtInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await sleep(200);
      const btn = [...(panel?.querySelectorAll("button") || [])].find((b) =>
        /Approve amount/i.test(b.textContent || ""),
      );
      return {
        tokenLine: (panel?.innerText || "").match(/Token:[\\s\\S]{0,60}/)?.[0],
        disabled: btn?.disabled,
        spender: panel?.querySelector('input[placeholder*="0x"]')?.value,
      };
    })()`,
  });
  console.log("RETRY", retry.result?.result?.value);
}

const click = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: `(() => {
    const panel = document.getElementById("perch-panel-approve");
    const btn = [...(panel?.querySelectorAll("button") || [])].find((b) =>
      /Approve amount/i.test(b.textContent || ""),
    );
    if (!btn || btn.disabled) {
      return {
        ok: false,
        why: "approve disabled",
        tokenLine: (panel?.innerText || "").match(/Token:[\\s\\S]{0,60}/)?.[0],
        disabled: btn?.disabled,
      };
    }
    btn.click();
    return { ok: true, clicked: true };
  })()`,
});
const start = click.result?.result?.value;
console.log("CLICK", start);
if (!start?.ok) {
  writeFileSync(
    "tmp-gate1-approve.json",
    JSON.stringify({ ok: false, prep: prepVal, start }, null, 2),
  );
  ws.close();
  process.exit(1);
}

let face = null;
for (let i = 0; i < 70; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const snap = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const text = document.body.innerText || "";
      const alerts = [...document.querySelectorAll("[role=alert], .err, .error, .warn-line")]
        .map((e) => (e.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 8);
      const tx = (text.match(/0x[a-fA-F0-9]{64}/) || [])[0] || null;
      const signing = /Signing|Confirm on Trezor|Suite|Look at/i.test(text);
      const err = alerts.find((a) =>
        /fail|error|reject|invalid|mainnet only|Pack-token/i.test(a),
      );
      return { alerts, tx, signing, err: err || null };
    })()`,
  });
  face = snap.result?.result?.value;
  console.log("WAIT", i, face);
  if (face?.tx) break;
  if (face?.err) break;
}

ws.close();
const ok = !!(face?.tx);
const out = { ok, prep: prepVal, start, face };
writeFileSync("tmp-gate1-approve.json", JSON.stringify(out, null, 2));
console.log(ok ? "GATE1_APPROVE_OK" : "GATE1_APPROVE_FAIL");
process.exit(ok ? 0 : 1);
