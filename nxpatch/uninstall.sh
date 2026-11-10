#!/bin/sh
# Restores the original host in a game .app. Usage: nxpatch/uninstall.sh "<path to the game .app>"
set -e
APP="${1:?usage: uninstall.sh \"<path to the game .app>\"}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ID="$(plutil -extract CFBundleIdentifier raw "$APP/Contents/Info.plist" | sed 's/^org\.nxnative\.//')"
HOST="$APP/Contents/MacOS/dmhost"
BACKUP="$HERE/backup/$ID.dmhost"
[ -f "$BACKUP" ] || { echo "no backup ($BACKUP): nothing to restore" >&2; exit 1; }
if pgrep -f "$HOST" >/dev/null; then echo "The game is running. Quit it first." >&2; exit 1; fi
cp -p "$BACKUP" "$HOST.restore" && mv "$HOST.restore" "$HOST"
codesign --force --sign - "$HOST"
codesign --force --sign - "$APP"
if [ -f "$HERE/installed.txt" ]; then grep -vxF "$APP" "$HERE/installed.txt" > "$HERE/installed.tmp" || true; mv "$HERE/installed.tmp" "$HERE/installed.txt"; fi
echo "restored the original host"
