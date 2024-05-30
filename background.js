/* global browser */

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    let tmp = await fetch(browser.runtime.getURL("settings.json"));
    tmp = await tmp.json();
    browser.storage.local.set({ selectors: tmp });
    browser.runtime.openOptionsPage();
  }
});

browser.browserAction.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});
