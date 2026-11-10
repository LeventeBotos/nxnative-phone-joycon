#!/usr/bin/env python3
"""Phone Joy-Con bridge: Socket.IO client that turns controller events into
macOS keyboard events (Quartz CGEventPost) using bridge/keymap.json."""
import argparse
import atexit
import json
import signal
import sys
import time
from pathlib import Path

import socketio

# macOS virtual keycodes (kVK_ANSI_* / kVK_*), US layout.
KEYCODES = {
    "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8,
    "v": 9, "b": 11, "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17,
    "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "9": 25, "7": 26,
    "8": 28, "0": 29, "o": 31, "u": 32, "i": 34, "p": 35, "l": 37, "j": 38,
    "k": 40, "n": 45, "m": 46,
    "return": 36, "tab": 48, "space": 49, "delete": 51, "escape": 53,
    "command": 55, "shift": 56, "option": 58, "control": 59,
    "left": 123, "right": 124, "down": 125, "up": 126,
}


class KeyOutput:
    def __init__(self, dry_run: bool):
        self.dry_run = dry_run
        self.held: set[str] = set()
        if not dry_run:
            import Quartz  # noqa: PLC0415
            self.Quartz = Quartz

    def set_key(self, name: str, down: bool) -> None:
        code = KEYCODES.get(name)
        if code is None:
            print(f"! unknown key name {name!r} in keymap", file=sys.stderr)
            return
        if down == (name in self.held):
            return
        (self.held.add if down else self.held.discard)(name)
        print(f"  key {'DOWN' if down else 'UP  '} {name}")
        if self.dry_run:
            return
        q = self.Quartz
        ev = q.CGEventCreateKeyboardEvent(None, code, down)
        q.CGEventPost(q.kCGHIDEventTap, ev)

    def release_all(self) -> None:
        for name in list(self.held):
            self.set_key(name, False)


def check_accessibility() -> None:
    try:
        from ApplicationServices import AXIsProcessTrusted  # noqa: PLC0415
        if not AXIsProcessTrusted():
            print(
                "WARNING: this terminal lacks Accessibility permission, so key events "
                "will be ignored.\n  System Settings > Privacy & Security > "
                "Accessibility > enable your terminal app, then restart it.",
                file=sys.stderr,
            )
    except Exception as exc:  # noqa: BLE001
        print(f"(could not check Accessibility permission: {exc})", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--server", default="http://localhost:3000")
    ap.add_argument("--keymap", default=str(Path(__file__).with_name("keymap.json")))
    ap.add_argument("--dry-run", action="store_true", help="print keys instead of posting them")
    args = ap.parse_args()

    keymap = json.loads(Path(args.keymap).read_text())
    deadzone = float(keymap.get("deadzone", 0.35))
    buttons: dict[str, str] = keymap["buttons"]
    sticks: dict[str, dict[str, str]] = keymap["sticks"]

    out = KeyOutput(args.dry_run)
    if not args.dry_run:
        check_accessibility()

    sio = socketio.Client(reconnection=True)
    stick_state: dict[str, set[str]] = {}

    @sio.event
    def connect():
        print(f"connected to {args.server}")
        sio.emit("hello", {"role": "bridge"})

    @sio.event
    def disconnect():
        print("disconnected - releasing keys")
        out.release_all()
        stick_state.clear()

    @sio.on("btn")
    def on_btn(data):
        key = buttons.get(data.get("id"))
        if key:
            out.set_key(key, bool(data.get("pressed")))

    @sio.on("stick")
    def on_stick(data):
        mapping = sticks.get(data.get("id"))
        if not mapping:
            return
        x, y = float(data.get("x", 0)), float(data.get("y", 0))
        want = set()
        if y > deadzone: want.add("up")
        if y < -deadzone: want.add("down")
        if x < -deadzone: want.add("left")
        if x > deadzone: want.add("right")
        prev = stick_state.get(data["id"], set())
        for d in prev - want:
            out.set_key(mapping[d], False)
        for d in want - prev:
            out.set_key(mapping[d], True)
        stick_state[data["id"]] = want

    @sio.on("releaseAll")
    def on_release_all():
        out.release_all()
        stick_state.clear()

    def shutdown(*_):
        out.release_all()
        sys.exit(0)

    atexit.register(out.release_all)
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    while True:
        try:
            sio.connect(args.server, transports=["websocket"])
            sio.wait()
        except socketio.exceptions.ConnectionError:
            print("server not reachable, retrying in 2s ...")
            time.sleep(2)


if __name__ == "__main__":
    main()
