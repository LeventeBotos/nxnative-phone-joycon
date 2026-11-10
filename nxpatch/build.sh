#!/bin/sh
# Builds a phone-pad-enabled NX2Apple host (dmhost) for one installed game. Touches nothing outside nxpatch/work and nxpatch/out.
# Usage: nxpatch/build.sh "<path to the game .app>"      e.g. nxpatch/build.sh "$HOME/switch/Mario Kart 8 Deluxe.app"
set -e
APP="${1:?usage: build.sh \"<path to the game .app>\"}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ID="$(plutil -extract CFBundleIdentifier raw "$APP/Contents/Info.plist" | sed 's/^org\.nxnative\.//')"
case "$ID" in [0-9A-Fa-f]*) ;; *) echo "cannot read the title id from $APP" >&2; exit 1;; esac

ENG="$(ls -dt "$HOME/Library/Application Support/NX2Apple/engine"/*/ 2>/dev/null | head -1)"
[ -n "$ENG" ] || { echo "NX2Apple's engine folder was not found in ~/Library/Application Support/NX2Apple/engine" >&2; exit 1; }
WORK="$HERE/work/engine-$(basename "$ENG")"

if [ ! -d "$WORK" ]; then
  echo "cloning the engine (APFS clone, no extra disk space) ..."
  mkdir -p "$HERE/work"
  cp -cR "$ENG" "$WORK" 2>/dev/null || cp -R "$ENG" "$WORK"
fi
cd "$WORK"
if ! grep -q netpad_mac.m dm/host/Makefile; then
  patch -p1 --dry-run -s < "$HERE/netpad.patch" >/dev/null || { echo "netpad.patch does not apply to this engine version; it needs updating" >&2; exit 1; }
  patch -p1 -s < "$HERE/netpad.patch"
fi
cp "$HERE/netpad_mac.m" dm/host/netpad_mac.m

PROFILES="$(dirname "$APP")/${ID}_build/profile"
if [ -d "$PROFILES" ]; then export DM_GAMES_DIR="$PROFILES" DM_GAMES_FIRST=1; fi
PY="$(command -v python3)"
cd dm/host
echo "building the host for $ID ..."
make -s PYTHON="$PY" GAME="$ID" "gen/$ID/game_profile.h" gen/vpx/libvpx.a gen/dav1d/libdav1d.a host_msl
mkdir -p "$HERE/out"
OUT="$HERE/out/dmhost-$ID"
make -n -B PYTHON="$PY" GAME="$ID" dmhost 2>/dev/null | grep ' -o dmhost ' > "$HERE/work/compile-$ID.sh"
[ -s "$HERE/work/compile-$ID.sh" ] || { echo "make gave no compile line" >&2; exit 1; }
sed -i '' "s# -o dmhost # -o \"$OUT\" #" "$HERE/work/compile-$ID.sh"
sh "$HERE/work/compile-$ID.sh" > "$HERE/work/build-$ID.log" 2>&1 || { tail -30 "$HERE/work/build-$ID.log"; echo "compile failed (full log: $HERE/work/build-$ID.log)" >&2; exit 1; }
echo "built: $OUT"
