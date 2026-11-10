@AGENTS.md

# Phone Joy-Con

Phone browser = virtual Switch controller for native Mac games. Phone → Socket.IO → `server.ts` (assigns player slots 1-4) → `bridge/bridge.py` → either virtual HID gamepads (`bridge/vpad`, one per slot) or macOS keyboard events (Quartz, all = player 1).

## Commands
- `npm run dev` - custom Next server + Socket.IO on 0.0.0.0:3000; prints LAN URL + QR
- `npm run bridge [-- --dry-run]` - Python bridge (needs `.venv`: `pip install -r bridge/requirements.txt`)
- `npx tsc --noEmit`, `npm run lint`, `npm run build`

## Layout
- `server.ts` - custom server (see node_modules/next/dist/docs/01-app/02-guides/custom-server.md); rooms: bridge clients join `bridge`; pad disconnect emits `releaseAll`
- `lib/protocol.ts` - shared event types (`btn {id,pressed}`, `stick {id,x,y}`, `status`, `releaseAll`, `hello {role}`)
- `lib/socket.ts` - client singleton; input uses `volatile.emit`
- `components/` - `ControllerApp` (layout picker state), `LayoutSelect`, `ProController`, `JoyConController` (single sideways Joy-Con, `side` left/right; random colour from `lib/joyconColors.ts`, chosen client-side on pick to avoid hydration mismatch), `useBridgeStatus`, `Joystick` (nipplejs, dynamic import), `TouchButton` (native non-passive touch listeners), `DPad`
- `bridge/keymap.json` - button/stick → key names; `bridge/bridge.py` holds the key-name → keycode table

## Conventions
- No custom touch tracking for sticks; use nipplejs. Buttons use touchstart/touchend, never click.
- Always release held keys on disconnect/exit (avoid stuck keys).
- nipplejs handlers receive one event arg: use `evt.data`.

## NX2Apple keymap
`bridge/keymap.json` mirrors NX2Apple defaults (`~/Library/Application Support/NX2Apple/engine/*/dm/host/input_map.h`). Right stick = `shift+<arrow>`: the bridge sets the Shift flag on the arrow event (NX2Apple reads `NSEvent.modifierFlags`). If a user sets `DM_KEYMAP` in NX2Apple, mirror it in keymap.json.

## Virtual gamepads
- `bridge/vpad/vpad.c`: IOHIDUserDevice helper driven by stdin lines (`probe`, `join N`, `leave N`, `rep N buttons hat lx ly rx ry`); build with `npm run build:vpad` (also makes `vpad-entitled`, ad-hoc signed; macOS kills it unless AMFI is relaxed). `bridge/hid_report.py` is the pure state-merge/report logic (`npm run test:bridge`); button numbers follow NX2Apple's generic HID default map.
- Creating the device needs `com.apple.developer.hid.virtual.device`; see README "Virtual gamepad mode". Output `auto` falls back to keyboard if it cannot.
- Server events to the bridge carry `slot` + `padId`; `padJoined`/`padLeft` replace the old `releaseAll`, so one phone leaving never releases another phone's input.

## NX2Apple host patch (nxpatch/)
Preferred multi-player path: `nxpatch/netpad_mac.m` + `netpad.patch` add a loopback UDP listener (47600) to NX2Apple's host that calls `dm_pad_set_player/dm_pad_players`. `nxpatch/build.sh|install.sh|uninstall.sh "<game .app>"` build in an APFS clone of the engine (never modify `~/Library/Application Support/NX2Apple`), swap the app's `Contents/MacOS/dmhost` (original kept in `nxpatch/backup`), and re-sign ad-hoc. Bridge `--output auto` uses it when `nxpatch/installed.txt` is non-empty. Wire format: `P <player> <DM_BTN bits> <lx> <ly> <rx> <ry>` / `L <player>`; keepalive every 1 s (host releases after 2 s).
