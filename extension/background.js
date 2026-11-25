/* Pulse Perch MV3 background — keep classic (no type:module) for Chrome load-unpacked lab. */
self.__PULSE_PERCH_EXT__ = true;

const PERCH_MATCH = [
  "http://127.0.0.1:5174/*",
  "http://localhost:5174/*",
  "http://127.0.0.1:5173/*",
  "http://localhost:5173/*",
];

const DESK_URL = "http://127.0.0.1:5174/";
const SESSION_KEY = "perchSession";
const OFFSCREEN_URL = "offscreen.html";
const OFFSCREEN_REASON = "DOM_SCRAPING";
const OFFSCREEN_JUSTIFICATION =
  "Host Pulse Perch desk iframe so EIP-1193 can relay without a visible desk tab. Signing stays on Connect/Suite inside the desk app.";

/** User is asking to connect — OK to open/focus desk. */
function isConnectIntent(method) {
  const m = String(method || "");
  return m === "eth_requestAccounts" || m === "wallet_requestPermissions";
}

/** Needs Suite/device — open desk or use offscreen bridge. */
function isSignIntent(method) {
  const m = String(method || "");
  return (
    m === "eth_sendTransaction" ||
    m === "eth_signTransaction" ||
    m === "eth_sign" ||
    m === "personal_sign" ||
    m === "eth_signTypedData" ||
    m === "eth_signTypedData_v3" ||
    m === "eth_signTypedData_v4" ||
    m === "wallet_sendCalls" ||
    m === "wallet_addEthereumChain" ||
    m === "wallet_switchEthereumChain" ||
    m === "wallet_watchAsset"
  );
}

/**
 * Storage-only reads when the desk tab is gone.
 * eth_accounts / permissions are NOT cached — that was connected theater
 * (dapp thinks wallet is live while Suite/device may be cold).
 * chainId / net_version may use last-known chain hint only.
 */
function isCachedChainHint(method) {
  const m = String(method || "");
  return m === "eth_chainId" || m === "net_version";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadSession() {
  try {
    const bag = await chrome.storage.session.get(SESSION_KEY);
    return bag?.[SESSION_KEY] || null;
  } catch {
    try {
      const bag = await chrome.storage.local.get(SESSION_KEY);
      return bag?.[SESSION_KEY] || null;
    } catch {
      return null;
    }
  }
}

async function saveSession(snap) {
  const payload = { [SESSION_KEY]: snap };
  try {
    await chrome.storage.session.set(payload);
  } catch {
    /* session storage missing on old chrome */
  }
  try {
    await chrome.storage.local.set(payload);
  } catch {
    /* ignore */
  }
}

function answerFromCache(method, session) {
  if (!session) return null;
  const chainId = Number(session.chainId) || 369;
  const hexChain = `0x${chainId.toString(16)}`;
  switch (String(method || "")) {
    case "eth_chainId":
      return hexChain;
    case "net_version":
      return String(chainId);
    default:
      return null;
  }
}

async function setDeskBadge(ok) {
  try {
    await chrome.action.setBadgeText({ text: ok ? "" : "!" });
    await chrome.action.setBadgeBackgroundColor({
      color: ok ? "#2a7a4b" : "#b33a3a",
    });
    await chrome.action.setTitle({
      title: ok
        ? "Pulse Perch — desk host reachable (not Suite/device ready)"
        : "Pulse Perch — desk closed (click to open)",
    });
  } catch {
    /* ignore */
  }
}

async function findPerchTab() {
  let best = null;
  for (const pattern of PERCH_MATCH) {
    const tabs = await chrome.tabs.query({ url: pattern });
    for (const tab of tabs) {
      if (tab?.id == null) continue;
      if (!best) {
        best = tab;
        continue;
      }
      if (tab.active && !best.active) {
        best = tab;
        continue;
      }
      if ((tab.lastAccessed || 0) > (best.lastAccessed || 0)) best = tab;
    }
  }
  return best;
}

async function refreshDeskBadge() {
  const tab = await findPerchTab();
  const off = await hasOffscreen();
  await setDeskBadge(!!tab || off);
  return tab;
}

async function hasOffscreen() {
  try {
    if (!chrome.offscreen?.hasDocument) return false;
    return await chrome.offscreen.hasDocument();
  } catch {
    return false;
  }
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return true;
  if (!chrome.offscreen?.createDocument) return false;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [OFFSCREEN_REASON],
      justification: OFFSCREEN_JUSTIFICATION,
    });
    await sleep(600);
    return true;
  } catch (e) {
    console.warn("ensureOffscreen", e?.message || e);
    return false;
  }
}

async function openOrFocusDesk() {
  const existing = await findPerchTab();
  if (existing?.id != null) {
    if (existing.discarded) {
      try {
        await chrome.tabs.reload(existing.id);
        await sleep(400);
      } catch {
        /* ignore */
      }
    }
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId != null) {
      try {
        await chrome.windows.update(existing.windowId, { focused: true });
      } catch {
        /* ignore */
      }
    }
    await setDeskBadge(true);
    return existing;
  }
  const created = await chrome.tabs.create({ url: DESK_URL, active: true });
  await setDeskBadge(true);
  return created;
}

async function ensurePerchBridge(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { kind: "eip1193-ping" });
    return true;
  } catch {
    /* bridge missing — inject */
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["perch-bridge.js"],
    });
    await sleep(200);
    return true;
  } catch (e) {
    console.warn("ensurePerchBridge", e?.message || e);
    return false;
  }
}

async function waitForDeskBridge(tabId, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    const ok = await ensurePerchBridge(tabId);
    if (ok) {
      try {
        await chrome.tabs.sendMessage(tabId, { kind: "eip1193-ping" });
        return true;
      } catch {
        /* not ready */
      }
    }
    await sleep(350);
  }
  return false;
}

async function forwardToTab(tab, method, params) {
  await ensurePerchBridge(tab.id);
  return chrome.tabs.sendMessage(tab.id, {
    kind: "eip1193-forward",
    method,
    params,
  });
}

async function forwardToOffscreen(method, params) {
  const ok = await ensureOffscreen();
  if (!ok) return null;
  try {
    return await chrome.runtime.sendMessage({
      kind: "eip1193-forward-offscreen",
      method,
      params,
    });
  } catch (e) {
    return {
      error: {
        code: 4100,
        message: e?.message || "Offscreen bridge unreachable",
      },
    };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.kind === "perch-session") {
    void (async () => {
      const prev = (await loadSession()) || {};
      const next = {
        address:
          msg.address !== undefined ? msg.address : prev.address || null,
        chainId:
          msg.chainId !== undefined
            ? msg.chainId
            : prev.chainId || 369,
        at: Date.now(),
      };
      await saveSession(next);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg?.kind === "eip1193-broadcast") {
    (async () => {
      if (msg.event === "accountsChanged" || msg.event === "chainChanged") {
        const session = (await loadSession()) || {};
        if (msg.event === "accountsChanged") {
          const acc = Array.isArray(msg.args?.[0]) ? msg.args[0][0] : null;
          session.address = acc || null;
        }
        if (msg.event === "chainChanged") {
          const hex = String(msg.args?.[0] || "");
          session.chainId = hex.startsWith("0x")
            ? parseInt(hex, 16)
            : Number(hex) || session.chainId;
        }
        session.at = Date.now();
        await saveSession(session);
      }
      const tabs = await chrome.tabs.query({
        url: ["https://*/*", "http://*/*"],
      });
      for (const tab of tabs) {
        if (tab.id == null) continue;
        const url = tab.url || "";
        if (/:\/\/(127\.0\.0\.1|localhost):(5173|5174)\b/.test(url)) {
          continue;
        }
        try {
          await chrome.tabs.sendMessage(tab.id, {
            kind: "eip1193-event",
            event: msg.event,
            args: msg.args || [],
          });
        } catch {
          /* tab without content.js */
        }
      }
    })();
    return false;
  }

  if (!msg || msg.kind !== "eip1193") return false;

  (async () => {
    let tab = await findPerchTab();
    await setDeskBadge(!!tab || (await hasOffscreen()));

    /* No visible desk tab: try offscreen (live inject) first — never fake accounts from storage. */
    if (!tab) {
      const viaOff = await forwardToOffscreen(msg.method, msg.params);
      if (viaOff && !viaOff.error) {
        sendResponse(viaOff);
        return;
      }
      if (isCachedChainHint(msg.method)) {
        const session = await loadSession();
        const cached = answerFromCache(msg.method, session);
        if (cached != null) {
          sendResponse({ result: cached });
          return;
        }
      }
      if (
        msg.method === "eth_accounts" ||
        msg.method === "wallet_getPermissions"
      ) {
        /* Empty = not connected. Do not resurrect last address from chrome.storage. */
        sendResponse({
          result: msg.method === "eth_accounts" ? [] : [],
        });
        return;
      }
      if (isCachedChainHint(msg.method)) {
        sendResponse({
          error: {
            code: 4100,
            message:
              "Pulse Perch not connected — open desk, Connect Trezor once",
          },
        });
        return;
      }
    }

    if (!tab && (isConnectIntent(msg.method) || isSignIntent(msg.method))) {
      /* Prefer offscreen bridge for signs when desk tab closed. */
      if (isSignIntent(msg.method) && !isConnectIntent(msg.method)) {
        const viaOff = await forwardToOffscreen(msg.method, msg.params);
        if (viaOff && !viaOff.error) {
          sendResponse(viaOff);
          return;
        }
      }
      tab = await openOrFocusDesk();
      if (tab?.id != null) {
        await waitForDeskBridge(tab.id);
      }
    }

    if (!tab) {
      const viaOff = await forwardToOffscreen(msg.method, msg.params);
      if (viaOff) {
        sendResponse(
          viaOff.error
            ? viaOff
            : viaOff.result !== undefined
              ? viaOff
              : { result: viaOff.result },
        );
        return;
      }
      sendResponse({
        error: {
          code: 4100,
          message: "Pulse Perch desk is closed — open it and connect Trezor",
        },
      });
      return;
    }

    if (tab.discarded && tab.id != null) {
      try {
        await chrome.tabs.reload(tab.id);
        await sleep(400);
        await waitForDeskBridge(tab.id);
      } catch {
        /* ignore */
      }
    }

    try {
      const resp = await forwardToTab(tab, msg.method, msg.params);
      sendResponse(
        resp || { error: { code: 4100, message: "No response from Perch" } },
      );
    } catch (e) {
      const viaOff = await forwardToOffscreen(msg.method, msg.params);
      if (viaOff && !viaOff.error) {
        sendResponse(viaOff);
        return;
      }
      sendResponse({
        error: {
          code: 4100,
          message:
            e?.message ||
            "Could not reach Pulse Perch — keep the desk tab open and reload once",
        },
      });
    }
  })();

  return true;
});

chrome.action.onClicked.addListener(async () => {
  await openOrFocusDesk();
  void ensureOffscreen();
});

chrome.tabs.onRemoved.addListener(() => {
  void refreshDeskBadge();
});

chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.status === "complete" || change.url) {
    void refreshDeskBadge();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void refreshDeskBadge();
  void ensureOffscreen();
});

void refreshDeskBadge();
