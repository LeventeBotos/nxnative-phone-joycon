#!/bin/sh
# Builds two helpers next to this script:
#   vpad           plain build (works for --dry-run; creates devices only if run as root / allowed)
#   vpad-entitled  ad-hoc signed with com.apple.developer.hid.virtual.device. macOS kills it at
#                  launch (exit 137) unless AMFI is relaxed - see README "Virtual gamepad mode".
set -e
cd "$(dirname "$0")"
clang -O2 -Wall -framework IOKit -framework CoreFoundation vpad.c -o vpad
cp vpad vpad-entitled
codesign -f -s - --entitlements vpad.entitlements vpad-entitled
echo "built: $(pwd)/vpad and vpad-entitled"
