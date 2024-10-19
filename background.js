/* global browser */

function iconBlink() {
  browser.browserAction.setBadgeText({ text: "✅" });
  browser.browserAction.disable();
  setTimeout(() => {
    browser.browserAction.enable();
    browser.browserAction.setBadgeText({ text: null });
  }, 500);
}

/*
async function copyToClipboardAsHTML(out) {
  let base_span = document.createElement("span"); // needs to be a <span> to prevent the final linebreak
  let span = document.createElement("span"); // needs to be a <span> to prevent the final linebreak
  span.style.position = "absolute";
  span.style.bottom = "-9999999"; // move it offscreen
  base_span.append(span);
  document.body.append(base_span);

  span.innerHTML = out.replace(/\n/g, "<br/>");

  if (
    typeof navigator.clipboard.write === "undefined" ||
    typeof ClipboardItem === "undefined"
  ) {
    base_span.focus();
    document.getSelection().removeAllRanges();
    var range = document.createRange();
    range.selectNode(base_span);
    document.getSelection().addRange(range);
    document.execCommand("copy");
  } else {
    navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([out.trim()], {
          type: "text/plain",
        }),
        "text/html": new Blob([base_span.innerHTML], {
          type: "text/html",
        }),
      }),
    ]);
  }
  base_span.remove();
}
*/

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    let tmp = await fetch(browser.runtime.getURL("settings.json"));
    tmp = await tmp.json();
    browser.storage.local.set({ selectors: tmp });
    browser.runtime.openOptionsPage();
  }
  await updateMenus();
});

browser.browserAction.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});

async function updateMenus() {
  await browser.menus.removeAll();

  const res = await browser.storage.local.get("selectors");

  res.selectors.forEach((sel) => {
    const mtitle = sel.code.split("\n")[0].trim();

    browser.menus.create({
      title: mtitle,
      contexts: ["tab", "page"],
      onclick: async (info, tab) => {
        let tmp = "";
        let out = "";
        let tabs = [];

        if (typeof info.frameId === "undefined") {
          tabs = await browser.tabs.query({
            highlighted: true,
            currentWindow: true,
            url: "<all_urls>",
            discarded: false,
            status: "complete",
          });

          if (tabs.length < 1) {
            return;
          }

          if (!tabs.map((t) => t.id).includes(tab.id)) {
            tabs = [tab];
          }
        } else {
          tabs = [tab];
        }

        for (const tab of tabs) {
          try {
            tmp = await browser.tabs.executeScript(tab.id, {
              code: `${sel.code}`,
            });

            tmp = tmp[0];
          } catch (e) {
            tmp = e.toString() + " " + tab.url + "\n";
          }

          out = tmp + out;
        }

        //console.debug(out);

        try {
          await navigator.clipboard.writeText(out);
          iconBlink();
        } catch (e) {
          // noop
        }
      },
    });
  });
}

browser.browserAction.setBadgeBackgroundColor({ color: "#00000000" });

browser.storage.onChanged.addListener(updateMenus);
