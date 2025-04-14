let mouse_x = null;
let mouse_y = null;

function onMouseUpdate(e) {
  mouse_x = e.pageX;
  mouse_y = e.pageY;
}

let page_menu_ul = document.createElement("ol");

page_menu_ul.setAttribute("start", 0);

page_menu_ul.style.position = "absolute";
page_menu_ul.style.display = "none";

document.body.appendChild(page_menu_ul);

// position absolute

function hide_page_menu_ul() {
  page_menu_ul.style.display = "none";
}

async function show_page_menu_ul() {
  const shortcutconfig = await getFromStorage("object", "shortcutconfig", null);

  const selectors = await getFromStorage("object", "selectors", []);

  page_menu_ul.innerHTML = "";

  shortcutconfig.forEach((sccEl, idx) => {
    if (sccEl.format !== "") {
      const mtitle =
        selectors[sccEl.format].code.split("\n")[0].trim() +
        " | " +
        translateScopes(sccEl.scope) +
        " | " +
        translateActions(sccEl.action);

      let li = document.createElement("li");

      let btn = document.createElement("button");

      btn.style["text-align"] = "left";
      btn.style.width = "100%";
      btn.style.color = "black";

      li.appendChild(btn);

      btn.innerText = mtitle;

      btn.addEventListener("click", (evt) => {
        browser.runtime.sendMessage({
          cmd: "" + idx,
        });
      });

      page_menu_ul.appendChild(li);
    }
  });

  page_menu_ul.style.display = "block";
  page_menu_ul.style.top = `${mouse_y}px`;
  page_menu_ul.style.left = `${mouse_x}px`;
}

document.addEventListener("mousemove", onMouseUpdate);
document.addEventListener("mouseenter", onMouseUpdate);
document.addEventListener("click", hide_page_menu_ul);

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.cmd === "show-page-actions") {
    show_page_menu_ul();
  }
});
