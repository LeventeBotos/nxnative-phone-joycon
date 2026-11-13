# Phone Joy-Con

Use your iPhone or Android browser as a Switch-style gamepad for native Mac games (e.g. nxnative / NX2Apple).

```
Phone browser (nipplejs sticks + touch buttons)
   │  Socket.IO over local Wi-Fi
   ▼
server.ts  (Next.js custom server + Socket.IO, listens on 0.0.0.0:4747)
   │  relays events to the bridge
   ▼
bridge/bridge.py  ──► macOS keyboard events (Quartz) ──► your game
```

macOS can't create a virtual HID gamepad without a signed driver, so the bridge **presses keyboard keys** according to `bridge/keymap.json`. Set the same keys in the game's keyboard controls.

## Setup

Requires Node 20+, Python 3.10+, macOS.

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r bridge/requirements.txt
```

## Run

Terminal 1 - web + socket server (prints your LAN IP and a QR code):

```bash
npm run dev
```

Terminal 2 - Mac bridge:

```bash
npm run bridge                 # virtual gamepads if available, else keyboard keys
npm run bridge -- --dry-run    # just print keys (no permissions needed)
```

Scan the QR code with your phone (same Wi-Fi) and rotate to landscape. Pick a layout on the first screen: **Pro Controller** (dark, one-piece), **Left Joy-Con** (stick, D-pad, L/ZL, minus) or **Right Joy-Con** (ABXY, stick, R/ZR, plus). Each Joy-Con fills the whole phone screen in a random Joy-Con colour; tap *New colour* to re-roll or *Change layout* to go back. The status dot turns green when the bridge is connected. For a production build: `npm run build && npm start`.

### Permissions
- **Accessibility:** System Settings → Privacy & Security → Accessibility → enable your terminal app, then restart it. Without this, key events are silently dropped.
- **Firewall:** allow incoming connections for Node if macOS asks.
- iOS tip: Share → *Add to Home Screen* gives a full-screen controller with no browser bars.

## Real players for each phone (NX2Apple host patch) - recommended

macOS won't let apps create virtual gamepads, so instead this project patches NX2Apple's own host (it compiles on your Mac) to accept phone pads as players. No security changes, no entitlement. See `nxpatch/README.md`.

```bash
nxpatch/install.sh "$HOME/switch/Mario Kart 8 Deluxe.app"   # once per game; quit the game first. Undo: nxpatch/uninstall.sh
npm run dev      # terminal 1
npm run bridge   # terminal 2 - uses the patched host automatically
```
Start the game, pick **P1-P4** (or Auto) on each phone, and each phone is its own player: Mario Kart's "players wanted" count rises as phones join, and sticks are analog. Two phones on the same player act as one controller (Left + Right Joy-Con). The game's log (`~/switch/log/<title id>.log`) says `netpad: phone player N joined`.

## Alternative: virtual HID gamepads (needs macOS entitlement)

With this mode every phone is its **own gamepad** to macOS, so NX2Apple gives each one its own player (up to 4) and multiplayer prompts like Mario Kart's "3 players wanted" can be satisfied. Pick **P1-P4** (or Auto) on the phone's first screen; two phones on the same player act as one controller (one Left + one Right Joy-Con).

How it works: `bridge/vpad/vpad.c` creates one `IOHIDUserDevice` per player ("Phone Joy-Con P1".."P4") and NX2Apple's generic HID gamepad reader picks them up. The report layout follows NX2Apple's default HID map (`dm/host/pad_hid.h`), so no button mapping is needed; sticks are analog.

**macOS blocks this by default.** Creating a virtual HID device needs Apple's `com.apple.developer.hid.virtual.device` entitlement, which only Apple-approved developer teams get. Without it the bridge automatically falls back to keyboard mode (everything = player 1). To enable virtual gamepads on your own Mac, one of:

1. **Root** (try first, no security change): build with `npm run build:vpad`, then in a Terminal run `echo probe | sudo bridge/vpad/vpad`. If it prints `ok probe`, run the bridge as root: `sudo .venv/bin/python bridge/bridge.py`.
2. **Relax AMFI** (reduces your Mac's security, reversible): disable SIP and set the `amfi_get_out_of_my_way=0x1` boot-arg from Recovery, then `npm run build:vpad` signs `vpad-entitled` with the entitlement. Steps differ by macOS version and Apple Silicon needs extra Recovery steps (Reduced Security, `bputil -k`); check Apple's current `csrutil`/`bputil` documentation. To revert: `sudo nvram -d boot-args`, `csrutil enable` in Recovery, and set Full Security again.
3. **Get the entitlement from Apple** (developer portal -> Identifiers -> Capability Requests -> "HID Virtual Device"); approval is not guaranteed.

Check it: `npm run bridge -- --output hid` must not print a "macOS killed it/refused" line; with phones connected, `ioreg -r -c IOHIDUserDevice | grep "Phone Joy-Con"` lists them, and in NX2Apple *Controllers -> Button Mapping* shows them. `DM_HID_LOG=1` makes NX2Apple log each button number. If NX2Apple cannot open the device, give it Input Monitoring permission.

Dry run (no security changes needed): `npm run bridge -- --output hid --dry-run` prints the reports. Tests: `npm run test:bridge`.

## Key mapping

`bridge/keymap.json` ships matching **NX2Apple's default keyboard map** (from its `input_map.h`), so it works with no configuration in the game:

| Phone | Key | Phone | Key |
|---|---|---|---|
| A / B / X / Y | J / K / U / I | L / R | Q / E |
| ZL / ZR | Z / C | Plus / Minus | Return / Tab |
| D-pad | arrow keys | L3 / R3 (stick click) | F / G |
| Left stick | W A S D | Right stick | Shift + arrow keys |

Notes:
- The game must be running in its window (`DM_WINDOW=1` / the launcher's window) and **focused**, or the keys go elsewhere.
- NX2Apple reads the right stick as Shift+arrows, so pressing a D-pad direction *while* the right stick is pushed in the same direction collides (same key). Rarely matters; to avoid it, move the right stick keys in NX2Apple with `DM_KEYMAP` (e.g. `RUp=<keycode>`) and mirror that in `keymap.json`.
- Sticks are digital (8-way) past the deadzone. Key names: `a-z`, `0-9`, arrows, `return`, `space`, `tab`, `escape`, `delete`, with modifier prefixes like `shift+up`.

## Troubleshooting
- Phone can't connect: check same Wi-Fi network, client isolation off, firewall prompt accepted.
- Status stays amber: the bridge isn't running or can't reach `--server` (default `http://localhost:4747`).
- Keys don't register in the game: grant Accessibility; make sure the game window is focused.

## Link to GitHub

```bash
gh repo create nxnative-phone-joycon --private --source=. --push
# or manually:
git remote add origin git@github.com:<your-user>/nxnative-phone-joycon.git
git push -u origin main
```
