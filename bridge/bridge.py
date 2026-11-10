#!/usr/bin/env python3
"""Phone Joy-Con bridge: a Socket.IO client that turns phone input into either

  netpad    UDP to a patched NX2Apple host (nxpatch/): one real player per phone, no macOS security change, or
  hid       one virtual HID gamepad per player slot (needs the vpad helper + macOS entitlement), or
  keyboard  macOS key presses via Quartz (everything is player 1) using bridge/keymap.json.

--output auto (default): netpad if a game was patched with nxpatch/install.sh, else hid, else keyboard."""
import argparse
import atexit
import json
import signal
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

import socketio

from hid_report import PadState, by_slot, report_fields, switch_fields

HERE = Path(__file__).resolve().parent
NETPAD_PORT = 47600
NETPAD_MARKER = HERE.parent / "nxpatch" / "installed.txt"   # written by nxpatch/install.sh

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
MODIFIER_FLAGS = {"shift": 1, "control": 2, "option": 4, "command": 8}
_FLAG_NAMES = {"shift": "kCGEventFlagMaskShift", "control": "kCGEventFlagMaskControl",
               "option": "kCGEventFlagMaskAlternate", "command": "kCGEventFlagMaskCommand"}


def mods_to_flag_names(mods):
    return [_FLAG_NAMES[m] for m in mods]


# ---------------------------------------------------------------- keyboard output
class KeyboardOutput:
    """Presses keys for the union of every phone's input (all phones are player 1)."""

    def __init__(self, keymap: dict, dry_run: bool):
        self.dry_run = dry_run
        self.buttons = keymap["buttons"]
        self.sticks = keymap["sticks"]
        self.deadzone = float(keymap.get("deadzone", 0.35))
        self.held: set[str] = set()
        if not dry_run:
            import Quartz  # noqa: PLC0415
            self.Quartz = Quartz
            check_accessibility()

    def _post(self, name: str, down: bool) -> None:
        # "shift+up" = arrow key with the Shift flag set on the event (NX2Apple reads the right
        # stick as Shift+arrows from each event's modifier flags, not from a Shift key press).
        *mods, base = name.lower().split("+")
        code = KEYCODES.get(base)
        flags = 0
        for m in mods:
            flags |= MODIFIER_FLAGS.get(m, -1)
        if code is None or flags < 0:
            print(f"! unknown key name {name!r} in keymap", file=sys.stderr)
            return
        print(f"  key {'DOWN' if down else 'UP  '} {name}")
        if self.dry_run:
            return
        q = self.Quartz
        ev = q.CGEventCreateKeyboardEvent(None, code, down)
        q.CGEventSetFlags(ev, sum(getattr(q, f) for f in mods_to_flag_names(mods)))
        q.CGEventPost(q.kCGHIDEventTap, ev)

    def apply(self, pads: dict) -> None:
        want: set[str] = set()
        for p in pads.values():
            want.update(self.buttons[b] for b in p.buttons if b in self.buttons)
        for sid, mapping in self.sticks.items():
            x, y = max((p.sticks[sid] for p in pads.values()), key=lambda v: v[0] ** 2 + v[1] ** 2, default=(0, 0))
            if y > self.deadzone: want.add(mapping["up"])
            if y < -self.deadzone: want.add(mapping["down"])
            if x < -self.deadzone: want.add(mapping["left"])
            if x > self.deadzone: want.add(mapping["right"])
        for k in self.held - want:
            self._post(k, False)
        for k in want - self.held:
            self._post(k, True)
        self.held = want

    def close(self) -> None:
        self.apply({})


# ---------------------------------------------------------------- netpad output
class NetPadOutput:
    """One pad per phone group (the slot picked on the phone is the pad number), sent as UDP datagrams to a host with network pads on (DM_NETPAD): the host gives each pad a player of its own."""

    def __init__(self, port: int, dry_run: bool):
        self.addr = ("127.0.0.1", port)
        self.dry_run = dry_run
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.fields: dict[int, tuple] = {}
        self.lock = threading.Lock()
        self.stop = threading.Event()
        # the host releases a player that is silent for 2 s, so a crashed bridge cannot leave a button held
        threading.Thread(target=self._keepalive, daemon=True).start()
        print(f"network pads: sending to 127.0.0.1:{port} (the game must run with DM_NETPAD={port})")

    def _send(self, msg: str) -> None:
        if self.dry_run:
            print(f"  udp {msg}")
            return
        try:
            self.sock.sendto(msg.encode(), self.addr)
        except OSError:
            pass  # no host listening (yet): UDP, so nothing to do

    def apply(self, pads: dict) -> None:
        groups = by_slot(pads)
        with self.lock:
            for slot, members in groups.items():
                f = switch_fields(members)
                if slot not in self.fields:
                    print(f"  pad {slot} joined")
                if self.fields.get(slot) != f:
                    self.fields[slot] = f
                    self._send(f"P {slot} " + " ".join(map(str, f)))
            for slot in set(self.fields) - set(groups):
                del self.fields[slot]
                print(f"  pad {slot} left")
                self._send(f"L {slot}")
                self._send(f"L {slot}")  # twice: UDP may drop one

    def _keepalive(self) -> None:
        while not self.stop.wait(1.0):
            with self.lock:
                for slot, f in self.fields.items():
                    self._send(f"P {slot} " + " ".join(map(str, f)))

    def close(self) -> None:
        self.stop.set()
        with self.lock:
            for slot in list(self.fields):
                self._send(f"L {slot}")
            self.fields.clear()


# ---------------------------------------------------------------- hid output
class HidOutput:
    """One virtual gamepad per player slot through the vpad helper."""

    def __init__(self, proc: subprocess.Popen):
        self.proc = proc
        self.slots: set[int] = set()
        self.last: dict[int, tuple] = {}

    @staticmethod
    def start(candidates: list[Path], dry_run: bool):
        """First helper that passes `probe`, else None."""
        for path in candidates:
            if not path.exists():
                continue
            cmd = [str(path)] + (["--dry-run"] if dry_run else [])
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
            ok = False
            reply = {}
            try:
                proc.stdin.write("probe\n")
                proc.stdin.flush()
                t = threading.Thread(target=lambda: reply.setdefault("line", proc.stdout.readline()), daemon=True)
                t.start()
                t.join(5)
                ok = reply.get("line", "").startswith("ok probe")
            except (BrokenPipeError, OSError):
                pass
            if ok:
                print(f"virtual gamepads: using {path.name}")
                if dry_run:  # keep the pipe drained in dry-run so the helper's output shows
                    threading.Thread(target=lambda: [print(l, end="") for l in proc.stdout], daemon=True).start()
                return HidOutput(proc)
            try:
                proc.wait(timeout=1)
                killed_by_macos = proc.returncode == -9 and not reply.get("line")
            except subprocess.TimeoutExpired:
                killed_by_macos = False
                proc.kill()
                proc.wait()
            why = ("macOS killed it: the virtual-HID entitlement is not allowed on this system (see README)"
                   if killed_by_macos else "macOS refused to create a virtual HID device (needs the entitlement/root, see README)")
            print(f"  {path.name}: {why}")
            for pipe in (proc.stdin, proc.stdout):
                try:
                    pipe.close()
                except OSError:
                    pass
        return None

    def _send(self, line: str) -> None:
        try:
            self.proc.stdin.write(line + "\n")
            self.proc.stdin.flush()
        except (BrokenPipeError, OSError):
            print("! virtual gamepad helper exited", file=sys.stderr)

    def apply(self, pads: dict) -> None:
        groups = by_slot(pads)
        for slot in set(groups) - self.slots:
            self._send(f"join {slot}")
            print(f"  player {slot} joined")
        for slot in self.slots - set(groups):
            self._send(f"leave {slot}")
            self.last.pop(slot, None)
            print(f"  player {slot} left")
        self.slots = set(groups)
        for slot, members in groups.items():
            fields = report_fields(members)
            if self.last.get(slot) != fields:
                self.last[slot] = fields
                self._send(f"rep {slot} " + " ".join(map(str, fields)))

    def close(self) -> None:
        try:
            self.proc.stdin.close()  # EOF: the helper destroys every device and exits
            self.proc.wait(timeout=3)
        except Exception:  # noqa: BLE001
            self.proc.kill()


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
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default="http://localhost:3000")
    ap.add_argument("--output", choices=["auto", "netpad", "hid", "keyboard"], default="auto")
    ap.add_argument("--netpad-port", type=int, default=NETPAD_PORT)
    ap.add_argument("--keymap", default=str(HERE / "keymap.json"))
    ap.add_argument("--vpad", help="path to the vpad helper (default: bridge/vpad/vpad-entitled, then vpad)")
    ap.add_argument("--dry-run", action="store_true", help="print what would be sent instead of acting")
    args = ap.parse_args()

    out = None
    netpad_ready = NETPAD_MARKER.exists() and NETPAD_MARKER.read_text().strip()
    if args.output == "netpad" or (args.output == "auto" and netpad_ready):
        out = NetPadOutput(args.netpad_port, args.dry_run)
    elif args.output in ("auto", "hid"):
        cands = [Path(args.vpad)] if args.vpad else [HERE / "vpad" / "vpad-entitled", HERE / "vpad" / "vpad"]
        out = HidOutput.start(cands, args.dry_run)
        if out is None and args.output == "hid":
            sys.exit("Virtual gamepads are not available (see README, 'Virtual gamepad mode').")
        if out is None:
            print("Falling back to keyboard output (all phones = player 1).")
    if out is None:
        out = KeyboardOutput(json.loads(Path(args.keymap).read_text()), args.dry_run)

    pads: dict[str, PadState] = {}
    lock = threading.Lock()
    sio = socketio.Client(reconnection=True)

    def refresh() -> None:
        out.apply(pads)

    @sio.event
    def connect():
        print(f"connected to {args.server}")
        sio.emit("hello", {"role": "bridge"})

    @sio.event
    def disconnect():
        print("disconnected - releasing everything")
        with lock:
            pads.clear()
            refresh()

    @sio.on("padJoined")
    def on_joined(d):
        with lock:
            pads[d["padId"]] = PadState(int(d["slot"]))
            refresh()

    @sio.on("padLeft")
    def on_left(d):
        with lock:
            pads.pop(d["padId"], None)
            refresh()

    @sio.on("btn")
    def on_btn(d):
        with lock:
            p = pads.setdefault(d["padId"], PadState(int(d["slot"])))
            (p.buttons.add if d.get("pressed") else p.buttons.discard)(d["id"])
            refresh()

    @sio.on("stick")
    def on_stick(d):
        with lock:
            p = pads.setdefault(d["padId"], PadState(int(d["slot"])))
            p.sticks[d["id"]] = (float(d.get("x", 0)), float(d.get("y", 0)))
            refresh()

    def shutdown(*_):
        out.close()
        sys.exit(0)

    atexit.register(out.close)
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
