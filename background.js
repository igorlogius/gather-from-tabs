/* global browser */

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

async function handleInstalled(details) {
  if (details.reason === "install") {
    await setToStorage("selectors", [
      { name: "Title", code: 'document.title + "\\n"' },
      { name: "URL", code: 'document.location.href + "\\n"' },
      {
        name: "Text (no breaks)",
        code: "document.body.innerText.replace(/(?:\\r\\n|\\r|\\n)/gm, ' ') + \"\\n\"",
      },
      {
        name: "1st paragraph (no breaks)",
        code: "document.querySelectorAll('p')[0].innerText.replace(/(?:\\r\\n|\\r|\\n)/gm, ' ') + \"\\n\"",
      },
      {
        name: "CSV (url,text) (no breaks, no dup spaces, escape quotes)",
        code: "document.location.href + ',\"' + document.body.innerText.replace(/(?:\\r\\n|\\r|\\n)/gm, ' ').replace(/\\s+/gm,' ').replace('\"','\"\"') + '\"' + \"\\n\"",
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
