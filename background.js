/* global browser */

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

  browser.menus.create({
    id: "copy_as_text",
    title: "Copy as Text",
    contexts: ["tab", "page"],
  });

  browser.menus.create({
    id: "copy_as_html",
    title: "Copy as HTML",
    contexts: ["tab", "page"],
  });

  browser.menus.create({
    id: "save_as_file",
    title: "Save as File",
    contexts: ["tab", "page"],
  });

  browser.menus.create({
    contexts: ["tab", "page"],
    type: "separator",
  });

  browser.menus.create({
    title: "Configure",
    contexts: ["tab", "page"],
    onclick: async (info) => {
      browser.runtime.openOptionsPage();
    },
  });

  const res = await browser.storage.local.get("selectors");

  for (const menu_parent of ["copy_as_html", "copy_as_text", "save_as_file"]) {
    res.selectors.forEach((sel) => {
      const mtitle = sel.code.split("\n")[0].trim();

      browser.menus.create({
        title: mtitle,
        contexts: ["tab", "page"],
        parentId: menu_parent,
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
              tabs = [tab];
            } else if (!tabs.map((t) => t.id).includes(tab.id)) {
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

          try {
            switch (menu_parent) {
              case "copy_as_text":
                navigator.clipboard.writeText(out);
                break;
              case "copy_as_html":
                copyToClipboardAsHTML(out);
                break;
              case "save_as_file":
                saveToFile(out, "");
                break;
            }
            iconBlink();
          } catch (e) {
            // noop
          }
        },
      });
    });
  }
}

browser.browserAction.setBadgeBackgroundColor({ color: "#00000000" });

browser.storage.onChanged.addListener(updateMenus);

async function onCommand(cmd) {
  const shortcutconfig = await getFromStorage("object", "shortcutconfig", null);

  if (shortcutconfig === null) {
    return;
  }

  const selectors = await getFromStorage("object", "selectors", []);

  let tmp;
  let out = "";

  const tabs = await getTabs(shortcutconfig[cmd].scope);

  for (const tab of tabs) {
    try {
      tmp = await browser.tabs.executeScript(tab.id, {
        code: `${selectors[shortcutconfig[cmd].format].code}`,
      });

      tmp = tmp[0];
    } catch (e) {
      tmp = e.toString() + " " + tab.url + "\n";
    }

    out = tmp + out;
  }

  switch (shortcutconfig[cmd].action) {
    case "ct":
      navigator.clipboard.writeText(out);
      break;
    case "ch":
      copyToClipboardAsHTML(out);
      break;
    case "s":
      saveToFile(out, "");
      break;
  }
  iconBlink();
}

browser.browserAction.setBadgeBackgroundColor({ color: "#00000000" });

browser.commands.onCommand.addListener(onCommand);
