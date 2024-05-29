/* global browser */

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

async function handleInstalled(details) {
  if (details.reason === "install") {
    const resp = await fetch(browser.runtime.getURL("settings.json"));
    const json = await resp.json();
    browser.storage.local.set({ selectors: json });
  }
}

browser.runtime.onInstalled.addListener(handleInstalled);

browser.browserAction.onClicked.addListener(async (tab) => {
  const panel_url = browser.runtime.getURL("popup.html");
  (await browser.tabs.query({ currentWindow: true })).forEach((t) => {
    if (t.url.startsWith(panel_url)) {
      browser.tabs.remove(t.id);
    }
  });
  browser.tabs.create({ url: panel_url, active: true });
});
