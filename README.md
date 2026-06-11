# Opal for Firefox

A Firefox extension that enforces [Opal](https://www.withopal.com/) screen-time blocks in **Zen Browser** and Firefox. Opal officially supports Chrome and Safari — this extension brings the same blocking to any Firefox-based browser.

When a blocked site is visited, the browser redirects to Opal's own block screen, identical to what Opal shows in Chrome and Safari.

---

## Requirements

- macOS with [Opal](https://www.withopal.com/) installed and at least one schedule or session configured
- Python 3 (pre-installed on macOS)
- Zen Browser or Firefox

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/hellolo180/opal-firefox.git
cd opal-firefox
```

### 2. Run the setup script

```bash
bash install.sh
```

This installs the native background service that reads Opal's block state, sets up the browser integration, and builds the extension package.

### 3. Install the extension in Zen

1. **Restart Zen Browser** (required for the setup changes to take effect)
2. Open `about:addons` → gear icon → **Install Add-on From File**
3. Select `opal-firefox.xpi` from the cloned folder

Done. The extension is now active.

---

## Usage

The extension runs automatically in the background — there is nothing to configure. It reads whatever you have set up in the Opal app.

**Toolbar popup** — click the Opal icon in the toolbar to see:
- Whether blocking is currently active
- The name of the active session (e.g. "💻 Work Time")
- Which categories and sites are blocked
- A **Refresh** button to sync immediately without waiting for the next poll

**Block screen** — navigating to a blocked site redirects to Opal's block screen, the same one shown in Chrome and Safari.

**Breaks** — taking a break inside Opal pauses blocking automatically within 15 seconds.

---

## After updating

If you pull new changes, rebuild and reinstall:

```bash
bash install.sh
```

Then in Zen: `about:addons` → gear → **Install Add-on From File** → select `opal-firefox.xpi`.

---

## Troubleshooting

**Popup shows "Native host error"**
- Re-run `bash install.sh` — the setup contains absolute paths that break if the folder is moved
- Verify Python 3 is available: `which python3`

**Popup shows "No active session" when Opal is blocking**
- The extension syncs every 30 seconds — wait a moment and click **Refresh**
- Check the background service is running: `launchctl list | grep opal`
- Inspect the current state: `cat ~/Library/Application\ Support/opal-firefox/state.json`

**A site isn't being blocked**
- Open `extension/categories.js`, find the relevant category, and add the missing domain
- Rebuild with `bash bundle.sh` and reinstall the `.xpi`

---

## License

MIT — see [LICENSE](LICENSE).  
This project is not affiliated with or endorsed by Opal (withopal.com). The Opal name and logo are trademarks of Opal and are used here solely for identification purposes.
