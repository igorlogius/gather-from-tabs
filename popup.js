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
  tr.style = "vertical-align:top;";

  Object.keys(feed)
    .sort()
    .reverse()
    .forEach((key) => {
      let input;
      if (key === "name" /*|| key === 'default'*/) {
        input = document.createElement("input");
        input.className = key;
        input.placeholder = key;
        input.style.width = "99%";
        input.type = "text";
        input.value = feed[key];
        tr.insertCell().appendChild(input);
      } else if (key === "code" /*|| key === 'default'*/) {
        input = document.createElement("input");
        input.className = key;
        input.placeholder = key;
        input.style.width = "99%";
        input.type = "text";
        input.value = feed[key];
        tr.insertCell().appendChild(input);
      }
    });

  if (feed.action === "add") {
    let button = createButton("➕", "addButton", function () {}, true);
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
    let runbutton = createButton(
      "▶️",
      "runButton",
      async function () {
        const code = tr.querySelector("td input.code").value;

        let tmp = "";
        let out = "";

        const tabs = await browser.tabs.query({
          currentWindow: true,
          highlighted: true,
        });

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

//const impbtnWrp = document.getElementById("impbtn_wrapper");
//const impbtn = document.getElementById("impbtn");
//const expbtn = document.getElementById("expbtn");
const optsbtn = document.getElementById("optsbtn");

/*
expbtn.addEventListener("click", async function () {
  let dl = document.createElement("a");
  let res = await browser.storage.local.get("selectors");
  let content = JSON.stringify(res.selectors, null, 4);
  dl.setAttribute(
    "href",
    "data:application/json;charset=utf-8," + encodeURIComponent(content)
  );
  dl.setAttribute("download", "data.json");
  dl.setAttribute("visibility", "hidden");
  dl.setAttribute("display", "none");
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
});
*/

// delegate to real Import Button which is a file selector
optsbtn.addEventListener("click", function (evt) {
  browser.runtime.openOptionsPage();
  window.close();
});

/*
impbtn.addEventListener("input", function (evt) {
  evt.preventDefault();
  let file = this.files[0];
  let reader = new FileReader();
  reader.onload = async function () {
    try {
      let config = JSON.parse(reader.result);
      //config = sanatizeConfig(config);
      await browser.storage.local.set({ selectors: config });
      document.querySelector("form").submit();
    } catch (e) {
      console.error("error loading file: " + e);
    }
  };
  reader.readAsText(file);
});
*/
