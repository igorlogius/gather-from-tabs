/* global browser */

const re_quote = new RegExp('"', "gm");
const re_break = new RegExp(/(\r\n|\n|\r)/, "gm");
const re_space = new RegExp(/\s+/, "gm");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let multipletabshighlighted = false;

async function notify(message = "", iconUrl = "icon.png", closeTimeout = 3000) {
  try {
    const manifest = browser.runtime.getManifest();
    const title = manifest.name;

    return await browser.notifications.create("" + Date.now(), {
      type: "basic",
      iconUrl,
      title,
      message,
    });
  } catch (e) {
    // noop
  }
  return null;
}

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
      onclick: async (info, clickedOnTab) => {
        let nid = await notify("Processing ... ");

        await sleep(3000);

        let tmp = "";
        let out = "";
        const code = row.code;

        //out = "idx,url,data";
        out = "";

        const tabs = multipletabshighlighted
          ? await browser.tabs.query({
              currentWindow: true,
              highlighted: true,
            })
          : [clickedOnTab];

        for (const tab of tabs) {
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
        browser.notifications.clear(nid);
        nid = await notify("Done!\nUse CTRL+V to past the gathered data");
        setTimeout(() => {
          browser.notifications.clear(nid);
        }, 6000);
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

function handleHighlighted(highlightInfo) {
  //console.debug(`Highlighted tabs: ${highlightInfo.tabIds}`);
  multipletabshighlighted = highlightInfo.tabIds.length > 1;
}

browser.tabs.onHighlighted.addListener(handleHighlighted);

browser.runtime.onInstalled.addListener(handleInstalled);

(async () => {
  await onStorageChange();
  browser.storage.onChanged.addListener(onStorageChange);
})();
