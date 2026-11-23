/* Pulse Perch MV3 background — keep classic (no type:module) for Chrome load-unpacked lab. */
self.__PULSE_PERCH_EXT__ = true;

const PERCH_MATCH = [
  "http://127.0.0.1:5174/*",
  "http://localhost:5174/*",
  "http://127.0.0.1:5173/*",
  "http://localhost:5173/*",
];

async function findPerchTab() {
  for (const pattern of PERCH_MATCH) {
    const tabs = await chrome.tabs.query({ url: pattern });
    if (tabs[0]?.id != null) return tabs[0];
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.kind !== "eip1193") return false;

  (async () => {
    let tab = await findPerchTab();
    if (!tab) {
      tab = await chrome.tabs.create({
        url: "http://127.0.0.1:5174/",
        active: true,
      });
      await new Promise((r) => setTimeout(r, 1500));
    }
    try {
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
