#!/bin/sh
# Compiles netpad_mac.m against stubs and feeds it UDP packets.
# Usage: nxpatch/test/netpad_test.sh <engine dm/host dir>   (for dm_input.h)
set -e
HOST="${1:?path to the engine dm/host directory}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(mktemp -d)"
clang -fobjc-arc -Wall -I"$HOST" "$HERE/../netpad_mac.m" "$HERE/stubs.m" -framework Foundation -o "$OUT/netpad_test"
DM_NETPAD=47611 "$OUT/netpad_test" > "$OUT/log.txt" 2>&1 &
PID=$!
sleep 1
python3 "$HERE/send_packets.py"
wait $PID
cat "$OUT/log.txt"
rm -rf "$OUT"
