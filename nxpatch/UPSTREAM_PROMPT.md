# Prompt for Claude Code: upstream "phone controllers" into nxnative / NX2Apple

Paste everything below the line into a fresh Claude Code session started in an empty working folder (e.g. `~/work`).

---

You are going to contribute a feature upstream: **phones as real controllers (one player per phone) for nxnative / NX2Apple**, as GitHub pull requests. A working local prototype exists on this Mac. Your job is to turn it into upstream-quality changes that follow the maintainers' conventions, and to open the PRs. Work carefully, test honestly, and do not overstate what was verified.

## 1. What exists (the prototype to port)

Local project: `~/nxnative-phone-joycon` (read-only reference; do not push from it). Read these first:

- `nxpatch/netpad_mac.m` - the host module. Binds a UDP socket on `127.0.0.1:47600` (`DM_NETPAD=<port>`, `0` = off) and feeds `dm_pad_set_player()` / `dm_pad_players()` from `dm/host/dm_input.h`, the same calls physical controllers use, so the game counts each phone as a controller (the controller-applet prompt "N players wanted", `ctrl_prompt.h`, then fills up). Dispatch sources on the main queue; a 2 s silence timeout releases a player.
- `nxpatch/netpad.patch` - the three small edits to the engine: `dm/host/Makefile` (add the file to `SRC`), `dm/host/controllers_mac.m` (OR the phone players into both `dm_pad_players(...)` calls, a `controllers_net_players(mask)` function that also calls `front_cp_poll()`), `dm/host/front_mac.m` (call `netpad_start()` after `front_controllers_start()`).
- `nxpatch/test/` - a stub harness (`netpad_test.sh`, `stubs.m`, `send_packets.py`) that exercises join, leave, clamping, bad packets and the timeout.
- `nxpatch/build.sh|install.sh|uninstall.sh` - how the prototype builds and swaps `dmhost` into a game `.app` (local tooling only; not for upstream).
- `bridge/bridge.py`, `bridge/hid_report.py` - the sender (`--output netpad`) and the per-phone state merge (a Left + Right Joy-Con pair on the same player = one controller).
- The phone-side web app (Next.js + Socket.IO + nipplejs, Pro Controller and single left/right Joy-Con layouts, player picker P1-P4, QR code on start) is the rest of the repo. See `README.md` and `CLAUDE.md` there.

Wire protocol (UDP text, one datagram per message): `P <player 1-8> <buttons> <lx> <ly> <rx> <ry>` where `buttons` = `DM_BTN_*` bits (`dm_input.h`), sticks -32767..32767 with +y up; `L <player>` = player left. The sender repeats `P` once per second as a keepalive.

Verified so far: the module against stubs (joins, leaves, clamping, ignored bad packets, timeout release), the bridge's packets for four fake phones, and a clean host build + install/uninstall on a copy of a game app. **Not verified:** a phone driving a real game end to end, rumble/motion, behavior with a physical controller connected at the same time, iOS. Say so in the PRs unless you verify them.

## 2. Repos and rules of engagement

- Engine: https://github.com/seedds/nxnative (the host in `dm/host`). Front end / Mac app: https://github.com/LNPANDY/NX2Apple. Fork both with `gh repo fork` using the already-authenticated GitHub account (`gh auth status`). Never push to the upstream default branch; work on a feature branch of the fork.
- Read, in this order, before writing code: `AGENTS.md`, `CONTRIBUTING.md`, `docs/frontends.md` (esp. "Following main" and the `Front-ends:` commit lines), `docs/development.md`, `docs/mac-controllers.md`, `docs/env_switches.tsv`, `docs/MULTIPLAYER.md` and `docs/ROADMAP.md` (check this feature does not collide with planned work), `dm/host/input_map.h` and `dm/host/pad_slots.h` (the "pure header, tested without devices" pattern), and `dm/host/tests/Makefile`. Follow their code style, comment style and file naming (`*_mac.m` keeps Mac-only code out of the iOS app).
- Open a GitHub issue first (or comment on an existing one) describing the feature and asking whether a loopback network-pad input is welcome, with the design below. Link it from the PR. If maintainers ask for a different shape (e.g. off by default, a different transport, a launcher setting), do that.
- Commit as the authenticated user (`gh api user`); do NOT use the maintainers' identity quoted in `AGENTS.md`. Keep personal details (names, emails, home paths) out of commits, PR text and docs.
- Do not touch unrelated files, reformat code, or change behavior when the feature is off.

## 3. PR 1 - engine (seedds/nxnative): "Network pads: phones and other apps as controllers"

Design to propose (adjust to maintainer feedback):

1. **Opt-in.** Off unless `DM_NETPAD=<port>` is set or a launcher setting is on (prototype defaults to on at 47600; propose off by default). Bind `127.0.0.1` only. Document the security stance (loopback only, any local process can inject input, so it is opt-in).
2. **Split it like `input_map.h`:** a pure header `dm/host/netpad.h` (message parsing, clamping, per-player state, expiry as functions of an explicit "now") and `netpad_mac.m` (socket + dispatch sources + calls into `dm_pad_*`). The prototype keeps both in one file; separate them.
3. **Tests:** `dm/host/tests/t_netpad.c` for the pure part (valid and malformed messages, player range 1..`DM_PLAYERS`, clamping, join/leave/timeout, mask changes), wired into the tests Makefile like `t_input_map.c`/`t_pad_hid.c`. Keep the stub-harness idea only if the maintainers' tests cannot cover the socket part.
4. **Correctness points to re-check in the real code:** `dm_pad_players()` already forces player 1 and masks to `DM_PLAYERS`; make sure a phone on player 1 coexists with the keyboard and a physical controller (inputs are ORed per `dm_input.h`); `g_merge` (`DM_PAD_MERGE=1`) and `DM_PAD_PRESS_TO_JOIN` behavior; `DM_KBD_PLAYER=own`; the controller-applet prompt via `front_cp_poll()`; a dispatch source must be kept in a static (the prototype had this bug); thread-safety (everything on the main queue); IPv4 only is fine. Consider using the existing pad slot allocator (`pad_slots.h`) instead of fixed player numbers, if that fits the maintainers' model better.
5. **Docs:** a row in `docs/env_switches.tsv` (class `switch`), a "Network pads" section in `docs/mac-controllers.md` (protocol table, examples with `nc -u`), a mention in `docs/development.md`'s Input row, and `docs/frontends.md` if a front end can offer the setting (add a row to the settings list / `dm/games/settings.tsv` if that is the mechanism for launcher toggles). Mention how it relates to `docs/MULTIPLAYER.md` (this is local input, not networked play).
6. **Commit message:** end with `Front-ends: new: DM_NETPAD (network pads on 127.0.0.1) - a front end can offer the toggle and run a sender` (the format described in `docs/frontends.md`).
7. **Quality gates** (run them; paste results in the PR): the tests Makefile targets for the files you touched; build the Mac host for at least two game profiles with the exact steps `scripts/build_ipa_from_nsp.py` uses (`make GAME=<id> ... dmhost`); `scripts/regress.py check --games` on the games `regress.py impact` suggests if the maintainers' setup allows it (it needs game files; if you cannot run it, say so); confirm the iOS targets still compile if feasible (`netpad_mac.m` must not be referenced by iOS builds).
8. **Real-game test with the user:** ask the user to run a real game (the prototype's target was Mario Kart 8 Deluxe) with 2-4 phones using the companion app, and report the results (player count in the prompt, buttons, analog sticks, leaving/rejoining, latency feel) in the PR. Do not claim it works until the user has confirmed.

PR description: motivation (macOS cannot create virtual HID gamepads without an Apple-restricted entitlement, so a host-side input source is the only way to give phones their own player slots without lowering system security), the design, the protocol table, what was tested and what was not, and a link to the companion sender (see below).

## 4. PR 2 - NX2Apple front end (LNPANDY/NX2Apple), only after PR 1 is accepted or its direction is agreed

Scope to propose in an issue first: a **"Phone controllers"** entry in settings that (a) toggles the engine setting via the saved-choices mechanism (`launcher.DM_NETPAD` in the app's preferences domain, as `docs/frontends.md` describes), (b) shows the Mac's LAN URL and a QR code for the companion web controller, and (c) shows how many phones are connected if the engine exposes it. Decide with the maintainers whether the companion web server should be bundled (it is Node-based, which may not fit a Swift app) or documented as an optional separate tool; do not bundle a Node runtime without agreement. If the maintainers prefer not to host it, publish the companion as its own repo and add a short docs page and link instead.

## 5. Companion (not for the engine repo)

The web controller + bridge stays in its own repository. Prepare it for a public release in the user's account: remove personal data, keep `nxpatch/` only as a pointer to the upstream PR once merged, add a LICENSE (ask the user which), and describe the protocol in its README. The bridge's `--output keyboard` fallback stays; remove the virtual-HID experiment (`bridge/vpad`) unless the user wants it kept, since it cannot work without an Apple entitlement.

## 6. Working method

- Start by reading, then write a short plan and show it to the user before editing. Make small, reviewable commits.
- Prefer the maintainers' existing helpers and patterns over new ones; if the prototype conflicts with them, the maintainers' way wins.
- If a gate fails or something cannot be verified, say exactly that in your report and in the PR; never describe untested behavior as working.
- Before opening each PR, show the user the final diff summary and PR text and wait for approval.
