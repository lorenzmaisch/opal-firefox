const dot           = document.getElementById("dot");
const statusLabel   = document.getElementById("status-label");
const sessionName   = document.getElementById("session-name");
const errorBox      = document.getElementById("error-box");
const catSection    = document.getElementById("categories-section");
const catList       = document.getElementById("categories-list");
const domSection    = document.getElementById("domains-section");
const domList       = document.getElementById("domains-list");
const refreshBtn    = document.getElementById("refresh-btn");

function listItem(text) {
  const el = document.createElement("div");
  el.className = "list-item";
  el.textContent = text;
  return el;
}

function render(state) {
  // Status
  if (state.error) {
    dot.className = "dot error";
    statusLabel.textContent = "Native host error";
    errorBox.style.display = "block";
    errorBox.textContent = state.error;
  } else if (state.active) {
    dot.className = "dot active";
    statusLabel.textContent = "Blocking active";
    errorBox.style.display = "none";
  } else {
    dot.className = "dot";
    statusLabel.textContent = "No active session";
    errorBox.style.display = "none";
  }

  // Session name
  sessionName.textContent = state.sessionName || "";

  // Categories
  const cats = state.blockedCategories || [];
  if (cats.length) {
    catList.innerHTML = "";
    cats.forEach(c => catList.appendChild(listItem(c)));
    catSection.style.display = "block";
  } else {
    catSection.style.display = "none";
  }

  // Domains
  const doms = state.blockedDomains || [];
  if (doms.length) {
    domList.innerHTML = "";
    doms.forEach(d => domList.appendChild(listItem(d)));
    domSection.style.display = "block";
  } else {
    domSection.style.display = "none";
  }
}

async function load(refresh = false) {
  try {
    const state = await browser.runtime.sendMessage({
      action: refresh ? "refresh" : "getState",
    });
    render(state);
  } catch (e) {
    dot.className = "dot error";
    statusLabel.textContent = "Extension error";
    errorBox.style.display = "block";
    errorBox.textContent = String(e);
  }
}

refreshBtn.addEventListener("click", () => load(true));
load();
