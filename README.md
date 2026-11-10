# Phone Joy-Con

Use your iPhone or Android browser as a Switch-style gamepad for native Mac games (e.g. nxnative / NX2Apple).

```
Phone browser (nipplejs sticks + touch buttons)
   │  Socket.IO over local Wi-Fi
   ▼
server.ts  (Next.js custom server + Socket.IO, listens on 0.0.0.0:3000)
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
npm run bridge                 # real key presses
npm run bridge -- --dry-run    # just print keys (no permissions needed)
```

Scan the QR code with your phone (same Wi-Fi) and rotate to landscape. The status dot turns green when the bridge is connected. For a production build: `npm run build && npm start`.

### Permissions
- **Accessibility:** System Settings → Privacy & Security → Accessibility → enable your terminal app, then restart it. Without this, key events are silently dropped.
- **Firewall:** allow incoming connections for Node if macOS asks.
- iOS tip: Share → *Add to Home Screen* gives a full-screen controller with no browser bars.

## Key mapping

Edit `bridge/keymap.json` (buttons, left/right stick directions, deadzone). Sticks are digital (8-way) past the deadzone. Valid key names: `a-z`, `0-9`, arrows, `return`, `space`, `tab`, `escape`, `shift`, `control`, `option`, `command`, `delete`.

## Troubleshooting
- Phone can't connect: check same Wi-Fi network, client isolation off, firewall prompt accepted.
- Status stays amber: the bridge isn't running or can't reach `--server` (default `http://localhost:3000`).
- Keys don't register in the game: grant Accessibility; make sure the game window is focused.

## Link to GitHub

```bash
gh repo create nxnative-phone-joycon --private --source=. --push
# or manually:
git remote add origin git@github.com:<your-user>/nxnative-phone-joycon.git
git push -u origin main
```
