# NX2Apple phone-pad patch

Gives each phone its own **player** in NX2Apple (up to 4, the host supports 8) without virtual HID devices, so no macOS entitlement and no security changes.

How: NX2Apple compiles its host (`dm/host`) on your Mac. `netpad_mac.m` adds a tiny UDP listener on `127.0.0.1:47600` that feeds `dm_pad_set_player()` / `dm_pad_players()` - the same calls physical controllers use - so the game counts each phone as a controller ("3 players wanted" is satisfied). `netpad.patch` makes three small edits to the engine (Makefile source list, `controllers_mac.m` player mask, one call in `front_mac.m`). `bridge/bridge.py` (`--output netpad`) sends `P <player> <buttons> <lx> <ly> <rx> <ry>` datagrams.

```
nxpatch/install.sh   "$HOME/switch/Mario Kart 8 Deluxe.app"   # builds, backs up the original host, swaps it in, re-signs (ad-hoc, like NX2Apple)
nxpatch/uninstall.sh "$HOME/switch/Mario Kart 8 Deluxe.app"   # restores the original host
```
- Quit the game first (the scripts refuse otherwise). Do this once per game app; re-run after NX2Apple repacks or updates a game.
- Works on a clone of NX2Apple's engine folder (`nxpatch/work`, APFS clone, no extra disk); your installed engine is never modified. The original `dmhost` is kept in `nxpatch/backup/`.
- `DM_NETPAD=0` in the game's environment turns the listener off; `DM_NETPAD=<port>` moves it (then pass `--netpad-port` to the bridge).
- `nxpatch/test/netpad_test.sh <engine>/dm/host` tests the module against stubs (join, leave, clamping, timeout).
- If `netpad.patch` stops applying after an NX2Apple update, the three hunks need re-basing on the new `dm/host`.
