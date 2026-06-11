#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_NAME="com.withopal.opalfirefox"
HOST_DIR="$HOME/Library/Application Support/opal-firefox"

# ── copy host files ───────────────────────────────────────────────────────────

mkdir -p "$HOST_DIR"
cp "$SCRIPT_DIR/native-host/opal_host.py"   "$HOST_DIR/opal_host.py"
cp "$SCRIPT_DIR/native-host/opal_host.sh"   "$HOST_DIR/opal_host.sh"
cp "$SCRIPT_DIR/native-host/opal_poller.py" "$HOST_DIR/opal_poller.py"
chmod +x "$HOST_DIR/opal_host.sh" "$HOST_DIR/opal_host.py" "$HOST_DIR/opal_poller.py"
echo "Host files copied      → $HOST_DIR"

# ── LaunchAgent (runs poller every 15s with full user permissions) ────────────

PLIST="$HOME/Library/LaunchAgents/$HOST_NAME.plist"
cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$HOST_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$HOST_DIR/opal_poller.py</string>
    </array>
    <key>StartInterval</key>
    <integer>15</integer>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "LaunchAgent installed  → $PLIST"

# ── native messaging manifests ────────────────────────────────────────────────

MANIFEST='{
  "name": "com.withopal.opalfirefox",
  "description": "Opal Firefox Bridge",
  "path": "'"$HOST_DIR/opal_host.sh"'",
  "type": "stdio",
  "allowed_extensions": ["opal-firefox@lorenzmaisch"]
}'

ZEN_NMH="$HOME/Library/Application Support/zen/NativeMessagingHosts"
mkdir -p "$ZEN_NMH"
echo "$MANIFEST" > "$ZEN_NMH/$HOST_NAME.json"
echo "Manifest installed     → $ZEN_NMH/$HOST_NAME.json"

MOZ_NMH="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
mkdir -p "$MOZ_NMH"
echo "$MANIFEST" > "$MOZ_NMH/$HOST_NAME.json"
echo "Manifest installed     → $MOZ_NMH/$HOST_NAME.json"

# ── allow unsigned extension in Zen ──────────────────────────────────────────

ZEN_PROFILE=$(python3 - <<'PY'
import configparser, pathlib, sys
base = pathlib.Path.home() / "Library/Application Support/zen"
ini  = base / "profiles.ini"
cp = configparser.ConfigParser()
cp.read(ini)
for s in cp.sections():
    if cp.get(s, "Default", fallback="0") == "1":
        p = cp.get(s, "Path", fallback=None)
        if p:
            full = base / p if not pathlib.Path(p).is_absolute() else pathlib.Path(p)
            print(full); sys.exit(0)
for d in (base / "Profiles").iterdir():
    if d.is_dir(): print(d); break
PY
)

if [ -n "$ZEN_PROFILE" ] && [ -d "$ZEN_PROFILE" ]; then
    USER_JS="$ZEN_PROFILE/user.js"
    PREF='user_pref("xpinstall.signatures.required", false);'
    if grep -qF "$PREF" "$USER_JS" 2>/dev/null; then
        echo "Signing bypass already set → $USER_JS"
    else
        echo "$PREF" >> "$USER_JS"
        echo "Signing bypass added       → $USER_JS"
    fi
else
    echo "Warning: could not find Zen profile — set xpinstall.signatures.required=false manually in about:config"
fi

# ── build the .xpi ────────────────────────────────────────────────────────────

bash "$SCRIPT_DIR/bundle.sh"

# ── done ─────────────────────────────────────────────────────────────────────

echo ""
echo "To finish:"
echo "  1. Restart Zen Browser"
echo "  2. Open about:addons → gear icon → 'Install Add-on From File'"
echo "  3. Select: $SCRIPT_DIR/opal-firefox.xpi"
