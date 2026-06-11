const NATIVE_HOST = "com.withopal.opalfirefox";
const POLL_INTERVAL_MS = 30_000;
const BLOCK_PAGE = browser.runtime.getURL("blocked.html");

let state = {
  active: false,
  blockedDomains: [],
  blockedCategories: [],
  allowedDomains: [],
  allBlockedDomains: [],
  error: null,
};

// ── domain matching ───────────────────────────────────────────────────────────

function matchesDomain(hostname, pattern) {
  const h = hostname.replace(/^www\./, "");
  const p = pattern.replace(/^www\./, "");
  return h === p || h.endsWith("." + p);
}

function buildAllBlockedDomains(domains, categories) {
  const set = new Set(domains);
  for (const cat of categories)
    (CATEGORY_DOMAINS[cat] || []).forEach((d) => set.add(d));
  return [...set];
}

function isBlocked(url) {
  if (!state.active) return false;
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return false; }
  if (state.allowedDomains.some((d) => matchesDomain(hostname, d))) return false;
  return state.allBlockedDomains.some((d) => matchesDomain(hostname, d));
}

// ── webRequest listener ───────────────────────────────────────────────────────

function buildOpalBlockUrl(originalUrl) {
  let hostname = originalUrl;
  try { hostname = new URL(originalUrl).hostname.replace(/^www\./, ""); } catch {}
  const u = new URL("https://shields.opal.so/v2/shield.html");
  u.searchParams.set("title",              "\n" + hostname);
  u.searchParams.set("detail",             "\n" + hostname + " is blocked by Opal");
  u.searchParams.set("backgroundColor",    "#004855ff");
  u.searchParams.set("redirect",           originalUrl);
  u.searchParams.set("emoji",              "🛡️");
  u.searchParams.set("primaryButtonTitle", "Go back");
  return u.toString();
}

function blockingListener(details) {
  if (!isBlocked(details.url)) return {};
  if (details.type === "main_frame")
    return { redirectUrl: buildOpalBlockUrl(details.url) };
  return { cancel: true };
}

let listenerRegistered = false;

function applyBlockState() {
  if (state.active && !listenerRegistered) {
    browser.webRequest.onBeforeRequest.addListener(
      blockingListener,
      { urls: ["<all_urls>"] },
      ["blocking"]
    );
    listenerRegistered = true;
  } else if (!state.active && listenerRegistered) {
    browser.webRequest.onBeforeRequest.removeListener(blockingListener);
    listenerRegistered = false;
  }
}

// ── native host communication ─────────────────────────────────────────────────

async function poll() {
  try {
    const response = await browser.runtime.sendNativeMessage(NATIVE_HOST, {
      action: "getState",
    });
    state.error = null;
    state.active = !!response.active;
    state.sessionName = response.sessionName || null;
    state.blockedDomains = response.domains || [];
    state.blockedCategories = response.categories || [];
    state.allowedDomains = response.allowedDomains || [];
    state.allBlockedDomains = buildAllBlockedDomains(
      state.blockedDomains,
      state.blockedCategories
    );
  } catch (err) {
    state.error = String(err);
  }

  applyBlockState();
  await browser.storage.local.set({ state: serializeState() });
}

function serializeState() {
  return {
    active: state.active,
    sessionName: state.sessionName,
    blockedDomains: state.blockedDomains,
    blockedCategories: state.blockedCategories,
    allowedDomains: state.allowedDomains,
    error: state.error,
  };
}

// ── startup & polling ─────────────────────────────────────────────────────────

poll();
setInterval(poll, POLL_INTERVAL_MS);

browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === "getState") return Promise.resolve(serializeState());
  if (msg.action === "refresh") return poll().then(() => serializeState());
});
