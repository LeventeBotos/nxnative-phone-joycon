"""Pure helpers: merge phones into one gamepad state per player slot and turn it into the
fields of the virtual HID report (layout in bridge/vpad/vpad.c).

Button numbering follows NX2Apple's generic-HID default map (dm/host/pad_hid.h, 8BitDo order):
HID button usage A=2 B=1 X=5 Y=4 L=7 R=8 ZL=9 ZR=10 MINUS=11 PLUS=12 LS=14 RS=15; the D-pad is
the hat switch; left stick = X/Y, right stick = Z/Rz; HID Y grows downward.
"""
from dataclasses import dataclass, field

# bit index in the 16-bit button field = HID usage - 1
BUTTON_BITS = {
    "B": 0, "A": 1, "Y": 3, "X": 4, "L": 6, "R": 7, "ZL": 8, "ZR": 9,
    "MINUS": 10, "PLUS": 11, "LS": 13, "RS": 14,
}
HAT_CENTER = 8
# (dx, dy) with dy up -> hat value (0 = up, clockwise to 7 = up-left)
_HAT = {(0, 1): 0, (1, 1): 1, (1, 0): 2, (1, -1): 3, (0, -1): 4, (-1, -1): 5, (-1, 0): 6, (-1, 1): 7}


@dataclass
class PadState:
    """One phone's current input."""
    slot: int
    buttons: set = field(default_factory=set)
    sticks: dict = field(default_factory=lambda: {"L": (0.0, 0.0), "R": (0.0, 0.0)})


def axis(v: float) -> int:
    """-1..1 -> 0..65535 (centre 32768)."""
    v = max(-1.0, min(1.0, float(v)))
    return int(round((v + 1) / 2 * 65535))


def _strongest(vectors):
    return max(vectors, key=lambda v: v[0] * v[0] + v[1] * v[1], default=(0.0, 0.0))


def report_fields(pads):
    """Merge the phones of ONE slot (a Left + Right Joy-Con pair is one player).

    Returns (button_mask, hat, lx, ly, rx, ry).
    """
    pads = list(pads)
    held = set().union(*(p.buttons for p in pads)) if pads else set()
    mask = 0
    for name, bit in BUTTON_BITS.items():
        if name in held:
            mask |= 1 << bit
    dx = ("RIGHT" in held) - ("LEFT" in held)
    dy = ("UP" in held) - ("DOWN" in held)
    hat = _HAT.get((dx, dy), HAT_CENTER)
    lx, ly = _strongest(p.sticks["L"] for p in pads)
    rx, ry = _strongest(p.sticks["R"] for p in pads)
    # stick "up" is +y on the phone; HID Y grows downward, so invert it
    return mask, hat, axis(lx), axis(-ly), axis(rx), axis(-ry)


def by_slot(pads):
    """{padId: PadState} -> {slot: [PadState, ...]}."""
    slots = {}
    for p in pads.values():
        slots.setdefault(p.slot, []).append(p)
    return slots
