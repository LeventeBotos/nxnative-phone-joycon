"""Run: python3 bridge/test_hid_report.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from hid_report import HAT_CENTER, PadState, axis, by_slot, report_fields  # noqa: E402

CENTER = axis(0)


def test_empty_is_neutral():
    assert report_fields([PadState(1)]) == (0, HAT_CENTER, CENTER, CENTER, CENTER, CENTER)
    assert report_fields([]) == (0, HAT_CENTER, CENTER, CENTER, CENTER, CENTER)


def test_buttons_use_nx2apple_usage_numbers():
    expect = {"B": 1, "A": 2, "Y": 4, "X": 5, "L": 7, "R": 8, "ZL": 9, "ZR": 10, "MINUS": 11, "PLUS": 12, "LS": 14, "RS": 15}
    for name, usage in expect.items():
        p = PadState(1, {name})
        assert report_fields([p])[0] == 1 << (usage - 1), name


def test_hat_directions_and_cancel():
    cases = [({"UP"}, 0), ({"UP", "RIGHT"}, 1), ({"RIGHT"}, 2), ({"RIGHT", "DOWN"}, 3), ({"DOWN"}, 4),
             ({"DOWN", "LEFT"}, 5), ({"LEFT"}, 6), ({"LEFT", "UP"}, 7), ({"UP", "DOWN"}, HAT_CENTER), (set(), HAT_CENTER)]
    for held, hat in cases:
        assert report_fields([PadState(1, held)])[1] == hat, held


def test_stick_y_is_inverted_for_hid():
    p = PadState(1)
    p.sticks["L"] = (0.0, 1.0)  # phone: full up
    _, _, lx, ly, _, _ = report_fields([p])
    assert ly == 0 and lx == CENTER  # HID Y minimum = up
    p.sticks["R"] = (1.0, -1.0)  # right + down
    _, _, _, _, rx, ry = report_fields([p])
    assert rx == 65535 and ry == 65535


def test_left_and_right_phone_merge_into_one_player():
    left = PadState(1, {"ZL", "UP"})
    left.sticks["L"] = (-0.5, 0.0)
    right = PadState(1, {"A"})
    right.sticks["R"] = (0.0, 0.5)
    mask, hat, lx, _, _, ry = report_fields([left, right])
    assert mask == (1 << 8) | (1 << 1) and hat == 0
    assert lx < CENTER and ry < CENTER


def test_same_button_on_two_phones_releases_only_with_both():
    a, b = PadState(1, {"A"}), PadState(1, {"A"})
    a.buttons.clear()
    assert report_fields([a, b])[0] & (1 << 1)
    b.buttons.clear()
    assert report_fields([a, b])[0] == 0


def test_by_slot_groups():
    g = by_slot({"x": PadState(1), "y": PadState(2), "z": PadState(1)})
    assert sorted(g) == [1, 2] and len(g[1]) == 2


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
    print(f"{len(tests)} tests passed")
