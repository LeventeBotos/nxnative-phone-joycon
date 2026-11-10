@AGENTS.md

# Phone Joy-Con

Phone browser = virtual Switch controller for native Mac games. Phone → Socket.IO → `server.ts` → `bridge/bridge.py` → macOS keyboard events (Quartz).

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
