/* Pulse Perch MV3 background — keep classic (no type:module) for Chrome load-unpacked lab. */
self.__PULSE_PERCH_EXT__ = true;

const PERCH_MATCH = [
  "http://127.0.0.1:5174/*",
  "http://localhost:5174/*",
  "http://127.0.0.1:5173/*",
  "http://localhost:5173/*",
];

async function findPerchTab() {
  /** Prefer active / most-recent desk tab — stale tabs lack a live inject host. */
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
    await new Promise((r) => setTimeout(r, 200));
    return true;
  } catch (e) {
    console.warn("ensurePerchBridge", e?.message || e);
    return false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.kind !== "eip1193") return false;

  (async () => {
    const tab = await findPerchTab();
    if (!tab) {
      sendResponse({
        error: {
          code: 4100,
          message: "Pulse Perch desk is closed — open it and connect Trezor",
        },
      });
      return;
    }
    try {
      await ensurePerchBridge(tab.id);
      const resp = await chrome.tabs.sendMessage(tab.id, {
        kind: "eip1193-forward",
        method: msg.method,
        params: msg.params,
      });
      sendResponse(resp || { error: { code: 4100, message: "No response from Perch" } });
    } catch (e) {
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
  const tab = await findPerchTab();
  if (tab?.id != null) {
    await chrome.tabs.update(tab.id, { active: true });
    return;
  }
  await chrome.tabs.create({ url: "http://127.0.0.1:5174/" });
});
