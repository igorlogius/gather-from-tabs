/* global browser */

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

async function handleInstalled(details) {
  if (details.reason === "install") {
    await setToStorage("selectors", [
      {
        name: "Title:URL",
        code: 'document.title +":"+ document.location.href + "\\n"',
      },
      {
        name: "Text (no breaks)",
        code: "document.body.innerText.replace(/(?:\\r\\n|\\r|\\n)/gm, ' ') + \"\\n\"",
      },
      {
        name: "1st paragraph (no breaks)",
        code: "document.querySelectorAll('p')[0].innerText.replace(/(?:\\r\\n|\\r|\\n)/gm, ' ') + \"\\n\"",
      },
      {
        name: "URLEncode(url)",
        code: 'encodeURI(document.location.href) + "\\n"',
      },
      {
        name: "CSV (url,text) (no breaks, no dup spaces, escape quotes)",
        code: "document.location.href + ',\"' + document.body.innerText.replace(/(?:\\r\\n|\\r|\\n)/gm, ' ').replace(/\\s+/gm,' ').replace('\"','\"\"') + '\"' + \"\\n\"",
      },
      {
        name: "Base64Encode URL",
        code: '(function(){const o=location.href;return btoa(Array.from((new TextEncoder).encode(o),(o=>String.fromCodePoint(o))).join(""))}()) + "\\n"',
      },
      {
        name: "(!Template!) Get innerText of first matching <Selector>",
        code: "document.querySelector('<Selector>').innerText + \"\\n\"",
      },
      {
        name: "(!Template!) Get innerText of <N>th matching <Selector>",
        code: "document.querySelectorAll('<Selector>')[<N>].innerText + \"\\n\"",
      },
    ]);
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
