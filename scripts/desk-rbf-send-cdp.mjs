/**
 * Fill Send: self-transfer + Slow (or micro tip) + Sign & send.
 * Env: CDP_PORT · optional AMOUNT (default 0.0001)
 */
import WebSocket from "ws";

const PORT = Number(process.env.CDP_PORT || 9233);
const AMOUNT = process.env.AMOUNT || "0.0001";
const MODE = process.env.RBF_MODE || "fill"; // fill | sign | speedup | probe

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

function setReactInput(elExpr, value) {
  return `(function(){
    const el = ${elExpr};
    if (!el) return false;
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, "value")
      || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    desc.set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`;
}

const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const page = list.find(
  (p) =>
    p.type === "page" &&
    /127\.0\.0\.1:517[34]/.test(p.url || "") &&
    p.webSocketDebuggerUrl,
);
if (!page) {
  console.error("NO_DESK");
  process.exit(1);
}
const { ws, send } = await wsRpc(page.webSocketDebuggerUrl);
await send("Runtime.enable");

const evalExpr = async (expression) => {
  const r = await send("Runtime.evaluate", {
    returnByValue: true,
    expression,
  });
  return r.result?.result?.value;
};

if (MODE === "probe") {
  const snap = await evalExpr(`(() => {
    const labels = [...document.querySelectorAll("label.field")].map((l) => {
      const name = (l.childNodes[0]?.textContent || l.textContent || "").trim().slice(0, 40);
      const input = l.querySelector("input");
      return { name, value: input?.value ?? null, ph: input?.placeholder ?? null };
    });
    const pills = [...document.querySelectorAll("button.gas-pill, button")].filter((b) =>
      /^(Slow|Standard|Fast|Instant|Sign|Speed up|Cancel|Max|Paste)/i.test((b.textContent||"").trim())
    ).map((b) => ({
      t: b.textContent.trim().slice(0, 40),
      on: b.classList.contains("on"),
      disabled: !!b.disabled,
    }));
    const addrBtn = [...document.querySelectorAll("button")].find((b) =>
      /^0x[a-fA-F0-9]{40}$/.test((b.textContent||"").trim())
    );
    return {
      addr: addrBtn?.textContent.trim() || null,
      labels: labels.slice(0, 20),
      pills,
      bodyHit: {
        pending: /pending/i.test(document.body.innerText),
        speedUp: /Speed up/i.test(document.body.innerText),
        signPhase: (document.body.innerText.match(/Sign[^\\n]{0,40}|Waiting|Confirm|broadcast/i)||[])[0] || null,
      }
    };
  })()`);
  console.log(JSON.stringify(snap, null, 2));
  ws.close();
  process.exit(0);
}

if (MODE === "speedup") {
  const r = await evalExpr(`(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /Speed up/i.test(b.textContent || "")
    );
    if (!btn || btn.disabled) return { ok: false, why: "no-speedup", disabled: !!btn?.disabled };
    btn.click();
    return { ok: true };
  })()`);
  console.log(JSON.stringify(r, null, 2));
  ws.close();
  process.exit(r?.ok ? 0 : 2);
}

const prep = await evalExpr(`(() => {
  const addrBtn = [...document.querySelectorAll("button")].find((b) =>
    /^0x[a-fA-F0-9]{40}$/.test((b.textContent||"").trim())
  );
  const addr = addrBtn?.textContent.trim();
  if (!addr) return { ok: false, why: "no-addr" };

  const fields = [...document.querySelectorAll("label.field")];
  const toLabel = fields.find((l) => /^To\\b/i.test((l.childNodes[0]?.textContent || "").trim()));
  const amtLabel = fields.find((l) => /^Amount\\b/i.test((l.childNodes[0]?.textContent || "").trim()));
  const toIn = toLabel?.querySelector("input");
  const amtIn = amtLabel?.querySelector("input");
  if (!toIn || !amtIn) {
    return { ok: false, why: "no-inputs", labels: fields.map(l => (l.childNodes[0]?.textContent||"").trim().slice(0,20)) };
  }

  function setVal(el, v) {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    desc.set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  setVal(toIn, addr);
  setVal(amtIn, ${JSON.stringify(AMOUNT)});

  // Slow tier for room to bump
  const slow = [...document.querySelectorAll("button")].find((b) =>
    /^Slow$/i.test((b.textContent || "").trim())
  );
  if (slow && !slow.disabled) slow.click();

  // Open Advanced and crush tip/max so it can stick pending on quiet net
  const adv = [...document.querySelectorAll("details.gas-details")].find((d) =>
    /Advanced/i.test(d.querySelector("summary")?.textContent || "")
  );
  if (adv && !adv.open) {
    adv.open = true;
    adv.dispatchEvent(new Event("toggle", { bubbles: true }));
  }
  const tipIn = document.querySelector('input[aria-label*="Priority tip"]');
  const maxIn = document.querySelector('input[aria-label*="Max fee"]');
  // Micro fees in beats (943) — intentionally under network so it parks pending
  if (tipIn) setVal(tipIn, "0.001");
  if (maxIn) setVal(maxIn, "0.01");

  return {
    ok: true,
    addr,
    to: toIn.value,
    amount: amtIn.value,
    tip: tipIn?.value ?? null,
    maxFee: maxIn?.value ?? null,
    slowOn: !!slow?.classList.contains("on"),
    slowDisabled: !!slow?.disabled,
  };
})()`);

console.log(JSON.stringify({ prep }, null, 2));
if (!prep?.ok) {
  ws.close();
  process.exit(2);
}

if (MODE === "sign") {
  // brief settle for React state
  await new Promise((r) => setTimeout(r, 400));
  const signed = await evalExpr(`(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /^Sign & send$/i.test((b.textContent || "").trim())
    );
    if (!btn) return { ok: false, why: "no-sign-btn", texts: [...document.querySelectorAll("button")].map(b=>b.textContent.trim()).filter(t=>/sign|send|busy|wait/i.test(t)).slice(0,8) };
    if (btn.disabled) return { ok: false, why: "sign-disabled", text: btn.textContent.trim() };
    btn.click();
    return { ok: true, clicked: true };
  })()`);
  console.log(JSON.stringify({ signed }, null, 2));
  ws.close();
  process.exit(signed?.ok ? 0 : 2);
}

ws.close();
