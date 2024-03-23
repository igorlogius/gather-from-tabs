/* global browser */

const re_quote = new RegExp('"', "gm");
const re_break = new RegExp(/(\r\n|\n|\r)/, "gm");
const re_space = new RegExp(/\s+/, "gm");

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

async function onStorageChange() {
  let tmp = await getFromStorage("object", "selectors", []);

  await browser.menus.removeAll();

  for (const row of tmp) {
    browser.menus.create({
      title: row.name,
      contexts: ["tab"],
      onclick: async (info) => {
        let tmp = "";
        let out = "";
        const code = row.code;

        //out = "idx,url,data";
        out = "";

        for (const tab of await browser.tabs.query({
          currentWindow: true,
          highlighted: true,
        })) {
          try {
            tmp = await browser.tabs.executeScript(tab.id, {
              code: `${code}`,
            });

            tmp = tmp[0];
          } catch (e) {
            tmp = e.toString();
          }
          //console.debug(tmp);

          //out = tab.index + ",\"" + tab.url + "\",\"" + tmp.replace(re_break," ").replace(re_space, " ").trim().replace(re_quote, '""') + "\"\r\n" + out;
          out = tmp + "\r\n" + out;
        }
        navigator.clipboard.writeText(out);
      },
    });
  }
}

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

async function handleInstalled(details) {
  if (details.reason === "install") {
    await setToStorage("selectors", [
      { name: "Page title", code: "document.title" },
      { name: "Page URL", code: "document.location.href" },
      { name: "Whole body Text", code: "document.body.innerText" },
      {
        name: "1st paragraph, no linebreaks",
        code: "document.querySelectorAll('p')[0].innerText.replace(/(?:\\r\\n|\\r|\\n)/g, ' ')",
      },
      { name: "#id", code: "document.getElementById('id').innerText" },
      { name: ".cssclass", code: "document.getElementById('id').innerText" },
      {
        name: "CSV ",
        code: "document.location.href + ',\"' + document.querySelectorAll('p')[0].innerText.replace(/(?:\\r\\n|\\r|\\n)/gm, ' ').replace(/\\s+/gm,' ').replace('\"','\"\"') + '\"'",
      },
    ]);
    await onStorageChange();

    // open option page
    // where user can add his actions
    browser.runtime.openOptionsPage();
  }
}

browser.runtime.onInstalled.addListener(handleInstalled);

(async () => {
  await onStorageChange();
  browser.storage.onChanged.addListener(onStorageChange);
})();
