/* global browser */

function onChange(evt) {
  let id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;
  let obj = {};

  if (value === "") {
    return;
  }
  if (el.type === "number") {
    try {
      value = parseInt(value);
      if (isNaN(value)) {
        value = el.min;
      }
      if (value < el.min) {
        value = el.min;
      }
    } catch (e) {
      value = el.min;
    }
  }

  obj[id] = value;

  browser.storage.local.set(obj).catch(console.error);
}

[
  /* add individual settings here */
].map((id) => {
  browser.storage.local
    .get(id)
    .then((obj) => {
      let el = document.getElementById(id);
      let val = obj[id];

      if (typeof val !== "undefined") {
        if (el.type === "checkbox") {
          el.checked = val;
        } else {
          el.value = val;
        }
      } else {
        el.value = 0;
      }
    })
    .catch(console.error);

  let el = document.getElementById(id);
  el.addEventListener("input", onChange);
});

function deleteRow(rowTr) {
  let mainTableBody = document.getElementById("mainTableBody");
  mainTableBody.removeChild(rowTr);
}

function createTableRow(feed) {
  let mainTableBody = document.getElementById("mainTableBody");
  let tr = mainTableBody.insertRow();
  tr.style = "vertical-align:middle;";

  Object.keys(feed)
    .sort()
    .reverse()
    .forEach((key) => {
      let input;
      if (key === "name" /*|| key === 'default'*/) {
        input = document.createElement("input");
        input.className = key;
        input.placeholder = key;
        input.style.width = "97%";
        input.type = "text";
        input.value = feed[key];
        tr.insertCell().appendChild(input);
      } else if (key === "code" /*|| key === 'default'*/) {
        input = document.createElement("textarea");
        input.className = key;
        input.placeholder = key;
        input.style.width = "99%";
        input.type = "text";
        input.value = feed[key];
        input.setAttribute("spellcheck", "false");
        tr.insertCell().appendChild(input);
      }
    });

  if (feed.action === "add") {
    let button = createButton("➕", "addButton", function () {}, true);
    button.setAttribute("title", "Add new script");
    tr.insertCell().appendChild(button);
  } else if (feed.action === "delete") {
    let button = createButton(
      "🗑",
      "deleteButton",
      function () {
        deleteRow(tr);
      },
      false
    );
    button.setAttribute("title", "Delete ");
    let runbutton = createButton(
      "▶️",
      "runButton",
      async function () {
        let origins = ["<all_urls>"];

        const permissionsToRequest = {
          origins,
        };

        const response = await browser.permissions.request(
          permissionsToRequest
        );

        if (response !== true) {
          alert(
            "[Error]: Required host permissions not available!\nPlease grant required permission to allow script execution."
          );
          return;
        }

        let tmp = "";
        let out = "";

        const tabs = await browser.tabs.query({
          currentWindow: true,
          url: "<all_urls>",
        });
        if (tabs.length < 1) {
          alert(
            "[Error]: No valid tabs found in this window!\nOpen at least one tab with a real URL before clicking the ▶️  button."
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
            tmp = e.toString();
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
      false
    );
    runbutton.setAttribute("title", "Run");
    button.append(runbutton);
    tr.insertCell().appendChild(button);
  } else {
    console.error("invalid action: ", feed.action);
  }
}

function collectConfig() {
  // collect configuration from DOM
  let mainTableBody = document.getElementById("mainTableBody");
  let feeds = [];
  for (let row = 0; row < mainTableBody.rows.length; row++) {
    try {
      let name = mainTableBody.rows[row].querySelector(".name").value.trim();
      let code = mainTableBody.rows[row].querySelector(".code").value.trim();
      if (name !== "" && code !== "") {
        feeds.push({
          name,
          code,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
  return feeds;
}

function createButton(text, id, callback, submit) {
  let span = document.createElement("span");
  let button = document.createElement("button");
  //button.id = id;
  button.textContent = text;
  //button.className = "browser-style";
  button.className = id;
  if (submit) {
    button.type = "submit";
  } else {
    button.type = "button";
  }
  button.name = id;
  button.value = id;
  button.addEventListener("click", callback);
  span.appendChild(button);
  return span;
}

async function saveOptions() {
  let config = collectConfig();
  //config = sanatizeConfig(config);
  await browser.storage.local.set({ selectors: config });
}

async function restoreOptions() {
  createTableRow({
    name: "",
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
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

const impbtnWrp = document.getElementById("impbtn_wrapper");
const impbtn = document.getElementById("impbtn");

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
      location.reload();
    } catch (e) {
      console.error("error loading file: " + e);
    }
  };
  reader.readAsText(file);
});

const expbtn = document.getElementById("expbtn");

expbtn.addEventListener("click", async function () {
  let dl = document.createElement("a");
  let res = await browser.storage.local.get("selectors");
  let content = JSON.stringify(res.selectors, null, 4);
  dl.setAttribute(
    "href",
    "data:application/json;charset=utf-8," + encodeURIComponent(content)
  );
  dl.setAttribute("download", "gather-from-tabs_export.json");
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
});
