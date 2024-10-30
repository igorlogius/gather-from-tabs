/* global browser */

const expbtn = document.getElementById("expbtn");
const impbtnWrp = document.getElementById("impbtn_wrapper");
const impbtn = document.getElementById("impbtn");
let mainTableBody = document.getElementById("mainTableBody");

function deleteRow(rowTr) {
  mainTableBody.removeChild(rowTr);
}

function createTableRow(feed, add = false) {
  let tr = mainTableBody.insertRow();
  if (add) {
    var firstRow = mainTableBody.rows[1];
    firstRow.parentNode.insertBefore(tr, firstRow);
  }
  tr.style = "vertical-align:top;";

  Object.keys(feed)
    .sort()
    .reverse()
    .forEach((key) => {
      let input;
      if (key === "code") {
        input = document.createElement("textarea");
        input.className = key;
        input.placeholder = key;
        input.style.width = "99%";
        input.type = "text";
        input.value = feed[key];
        input.setAttribute("spellcheck", "false");
        input.style.height = "1em";

        input.addEventListener("focusin", (evt) => {
          evt.target.style.height = "1em";
          evt.target.style.height = evt.target.scrollHeight + "px";
        });
        input.addEventListener("input", (evt) => {
          evt.target.style.height = "1em";
          evt.target.style.height = evt.target.scrollHeight + "px";
        });
        tr.insertCell().appendChild(input);
      }
    });

  if (feed.action === "add") {
    let button = createButton(
      "➕",
      "addButton",
      function () {
        let code = mainTableBody.rows[0].querySelector(".code").value.trim();

        createTableRow(
          {
            code,
            action: "delete",
          },
          true,
        );
        mainTableBody.rows[0].querySelector(".code").value = "";
      },
      true,
    );

    button.setAttribute("title", "Add new script");
    tr.insertCell().appendChild(button);
  } else if (feed.action === "delete") {
    let deletebutton = createButton(
      "🗑",
      "deleteButton",
      function () {
        deleteRow(tr);
      },
      false,
    );
    deletebutton.setAttribute("title", "Delete ");
    let runbutton = createButton(
      "▶️",
      "runButton",
      async function () {
        let tmp = "";
        let out = "";

        let tabs = await browser.tabs.query({
          active: false,
          highlighted: true,
          currentWindow: true,
          url: "<all_urls>",
          discarded: false,
          status: "complete",
        });

        if (tabs.length < 1) {
          alert(
            "[Error]: No tabs with a valid url selected in this window!\nPlease select at least one tab with a real URL before clicking the ▶️  button.",
          );
          return;
        }

        const code = tr.querySelector("td textarea.code").value;

        for (const tab of tabs) {
          try {
            tmp = await browser.tabs.executeScript(tab.id, {
              code: `${code}`,
            });

            tmp = tmp[0];
          } catch (e) {
            tmp = e.toString() + " " + tab.url + "\n";
          }

          out = tmp + out;
        }
        document.querySelector("#output").value = out;

        try {
          await navigator.clipboard.writeText(out);
        } catch (e) {
          // noop
        }
      },
      false,
    );
    runbutton.setAttribute("title", "Run");
    runbutton.append(deletebutton);
    tr.insertCell().appendChild(runbutton);
  } else {
    console.error("invalid action: ", feed.action);
  }
}

function collectConfig() {
  // collect configuration from DOM
  let feeds = [];
  for (let row = 1; row < mainTableBody.rows.length; row++) {
    try {
      let code = mainTableBody.rows[row].querySelector(".code").value.trim();
      if (code !== "") {
        feeds.push({
          code,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
  return feeds;
}

function createButton(text, id, callback) {
  let span = document.createElement("span");
  let button = document.createElement("button");
  button.textContent = text;
  button.className = id;
  button.type = "button";
  button.name = id;
  button.value = id;
  button.addEventListener("click", callback);
  span.appendChild(button);
  return span;
}

async function saveTable() {
  let config = collectConfig();
  await browser.storage.local.set({ selectors: config });
}

async function restoreOptions() {
  createTableRow({
    code: "",
    action: "add",
  });
  let res = await browser.storage.local.get("selectors");
  if (!Array.isArray(res.selectors)) {
    return;
  }
  res.selectors.forEach((selector) => {
    selector.action = "delete";
    createTableRow(selector);
  });

  // todo move all event listener here
  //#registerAllOtherElementEventListeners();
}

document.addEventListener("DOMContentLoaded", restoreOptions);

document.querySelector("#savetable").addEventListener("click", () => {
  if (confirm("Are you sure?\nThis will Save the table as it is now")) {
    saveTable();
    location.reload();
  }
});

document.querySelector("#discardEdits").addEventListener("click", () => {
  if (
    confirm("Are you sure?\nThis will Discard all edits and restore the table")
  ) {
    mainTableBody.innerHTML = "";
    restoreOptions();
  }
});

document.querySelector("#shrink").addEventListener("click", () => {
  Array.from(document.querySelectorAll("td textarea.code")).forEach((el) => {
    el.style.height = "1em";
    el.scrollTop = 0;
  });
});

// delegate to real Import Button which is a file selector
impbtnWrp.addEventListener("click", function () {
  impbtn.click();
});

impbtn.addEventListener("input", function () {
  let file = this.files[0];
  let reader = new FileReader();
  reader.onload = async function () {
    try {
      let config = JSON.parse(reader.result);
      //config = sanatizeConfig(config);
      await browser.storage.local.set({ selectors: config });
      let mainTableBody = document.getElementById("mainTableBody");
      mainTableBody.innerHTML = "";
      restoreOptions();
    } catch (e) {
      console.error("error loading file: " + e);
    }
  };
  reader.readAsText(file);
});

expbtn.addEventListener("click", async function () {
  let dl = document.createElement("a");
  let res = await browser.storage.local.get("selectors");
  let content = JSON.stringify(res.selectors, null, 4);
  dl.setAttribute(
    "href",
    "data:application/json;charset=utf-8," + encodeURIComponent(content),
  );
  dl.setAttribute("download", "gather-from-tabs_export.json");
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
});

document.getElementById("btn_copy_as_html").addEventListener("click", () => {
  copyToClipboardAsHTML(document.querySelector("#output").value);
});

document.getElementById("btn_copy_as_text").addEventListener("click", () => {
  navigator.clipboard.writeText(document.querySelector("#output").value);
});

let shortcutconfig;

async function saveConfig() {
  shortcutconfig = [];

  Array.from(document.querySelectorAll("#shortcutconfigs tr")).forEach((tr) => {
    let tmp = Array.from(tr.querySelectorAll("select")).map((e) => e.value);

    shortcutconfig.push({ format: tmp[0], scope: tmp[1], action: tmp[2] });
  });

  setToStorage("shortcutconfig", shortcutconfig);
}

async function restoreConfig() {
  const shortcutconfig = await getFromStorage("object", "shortcutconfig", []);

  if (shortcutconfig.length > 0) {
    Array.from(document.querySelectorAll("#shortcutconfigs tr")).forEach(
      (tr) => {
        const selects = tr.querySelectorAll("select");

        selects[0].value = shortcutconfig[0].format;
        selects[1].value = shortcutconfig[0].scope;
        selects[2].value = shortcutconfig[0].action;

        shortcutconfig.shift();
      },
    );
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  let formatStrings = await getFromStorage("object", "selectors", []);

  let formatlists = document.querySelectorAll('select[name="formatlist"]');

  formatlists.forEach((fl) => {
    fl.add(new Option("-- Script --", ""));
    formatStrings.forEach((feed, index) => {
      Object.keys(feed).forEach((key) => {
        if (key === "code") {
          fl.add(new Option(feed[key].split("\n")[0].trim(), index));
        }
      });
    });
  });

  let scopelists = document.querySelectorAll('select[name="scopelist"]');

  scopelists.forEach((sl) => {
    sl.add(new Option("-- Scope --", ""));
    sl.add(new Option("Current Window", "AllTabs"));
    sl.add(new Option("Selected Current Window ", "SelectedTabs"));
    sl.add(new Option("All Windows", "AllTabsAllWindows"));
    sl.add(new Option("Selected All Windows", "SelectedTabsAllWindows"));
  });

  let actionlists = document.querySelectorAll('select[name="actionlist"]');

  actionlists.forEach((al) => {
    al.add(new Option("-- Action --", ""));
    al.add(new Option("Copy as Text", "ct"));
    al.add(new Option("Copy as HTML", "ch"));
    al.add(new Option("Save to File", "s"));
  });

  // monitor all dropdown for changes and save the entire tabe into a config on change

  Array.from(document.querySelectorAll("select")).forEach((select) => {
    select.addEventListener("change", saveConfig);
  });

  restoreConfig();
});
