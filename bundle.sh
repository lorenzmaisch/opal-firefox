#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$SCRIPT_DIR/opal-firefox.xpi"

cd "$SCRIPT_DIR/extension"
zip -qr "$OUT" .

echo "Bundled → $OUT"
