// Closes the tab when the player loses the chess gate.
browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "close-tab" && sender.tab?.id != null) {
    browser.tabs.remove(sender.tab.id);
  }
});

// Content scripts only load into pages opened after the extension (re)loads.
// Inject them into tabs that were already open so they work without a refresh.
browser.runtime.onInstalled.addListener(async () => {
  const { content_scripts: [cs] } = browser.runtime.getManifest();
  const tabs = await browser.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const tab of tabs) {
    try {
      const target = { tabId: tab.id };
      const [{ result: loaded }] = await browser.scripting.executeScript({
        target,
        func: () => typeof ChessEngine !== "undefined",
      });
      if (loaded) continue;
      await browser.scripting.insertCSS({ target, files: cs.css });
      await browser.scripting.executeScript({ target, files: cs.js });
    } catch {
      // Restricted pages (addons.mozilla.org, reader view, ...) refuse injection.
    }
  }
});
