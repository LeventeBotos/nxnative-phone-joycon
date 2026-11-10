#!/bin/sh
# Installs the phone-pad host into a game .app (backs up the original; quit the game first).
# Usage: nxpatch/install.sh "<path to the game .app>"
set -e
APP="${1:?usage: install.sh \"<path to the game .app>\"}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ID="$(plutil -extract CFBundleIdentifier raw "$APP/Contents/Info.plist" | sed 's/^org\.nxnative\.//')"
HOST="$APP/Contents/MacOS/dmhost"
[ -f "$HOST" ] || { echo "no $HOST" >&2; exit 1; }
if pgrep -f "$HOST" >/dev/null; then echo "The game is running. Quit it first, then run this again." >&2; exit 1; fi

"$HERE/build.sh" "$APP"
NEW="$HERE/out/dmhost-$ID"
mkdir -p "$HERE/backup"
BACKUP="$HERE/backup/$ID.dmhost"      # outside the bundle, so it never becomes part of the app's signature
[ -f "$BACKUP" ] || cp -p "$HOST" "$BACKUP"     # one-time backup of the original host
cp "$NEW" "$HOST.new" && chmod +x "$HOST.new" && mv "$HOST.new" "$HOST"
# sign like NX2Apple does (dm/mac/pack_app.py): the inner host first, then the bundle; ad-hoc, no hardened runtime
codesign --force --sign - "$HOST"
codesign --force --sign - "$APP"
codesign --verify --deep "$APP" && echo "signature ok"
grep -qxF "$APP" "$HERE/installed.txt" 2>/dev/null || echo "$APP" >> "$HERE/installed.txt"
echo "installed. Start the game, then run: npm run bridge"
echo "undo with: nxpatch/uninstall.sh \"$APP\""
