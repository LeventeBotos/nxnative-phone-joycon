// netpad_mac.m - Phone Joy-Con network pads for the NX2Apple Mac host (local patch, see nxpatch/README.md).
//
// Listens on 127.0.0.1:<DM_NETPAD, default 47600> for UDP text datagrams from bridge/bridge.py and feeds them to the host as
// players 1..8 (dm_pad_set_player / dm_pad_players), exactly like physical controllers: each phone becomes its own player, so
// the game's "N players wanted" prompt counts it. Set DM_NETPAD=0 to turn this off.
//
//   P <player 1-8> <buttons> <lx> <ly> <rx> <ry>   buttons = DM_BTN_* bits (dm_input.h), sticks -32767..32767, +y is up
//   L <player>                                     the player left (everything released)
//
// A player that sends nothing for 2 s is released too, so a crashed bridge cannot leave a button held.
#import <Foundation/Foundation.h>
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>
#include "dm_input.h"

void controllers_net_players(uint32_t mask);   // controllers_mac.m: ORs these players into dm_pad_players

#define NETPAD_PORT 47600
#define NETPAD_TIMEOUT_S 2.0

static dispatch_source_t g_rd, g_tm;   // kept alive: a dispatch source that ARC releases is cancelled
static double g_seen[DM_PLAYERS];   // last packet time per player, 0 = not a netpad player
static uint32_t g_mask;             // players currently held by phones
static int32_t clampi(long v) { return v > DM_STICK_MAX ? DM_STICK_MAX : v < -DM_STICK_MAX ? -DM_STICK_MAX : (int32_t)v; }
static double now_s(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return (double)t.tv_sec + t.tv_nsec / 1e9; }

static void set_mask(uint32_t m) {
    if (m == g_mask) return;
    g_mask = m;
    controllers_net_players(g_mask);
}
static void release_player(int p) {
    dm_pad_set_player(p, 0, 0, 0, 0, 0);
    g_seen[p] = 0;
    if (g_mask >> p & 1) { fprintf(stderr, "netpad: phone player %d left\n", p + 1); set_mask(g_mask & ~(1u << p)); }
}
static void on_packet(const char *s) {
    int slot; unsigned long long b; long lx, ly, rx, ry;
    if (sscanf(s, "P %d %llu %ld %ld %ld %ld", &slot, &b, &lx, &ly, &rx, &ry) == 6 && slot >= 1 && slot <= DM_PLAYERS) {
        int p = slot - 1;
        g_seen[p] = now_s();
        if (!(g_mask >> p & 1)) { fprintf(stderr, "netpad: phone player %d joined\n", slot); set_mask(g_mask | 1u << p); }
        dm_pad_set_player(p, b & 0xffffull, clampi(lx), clampi(ly), clampi(rx), clampi(ry));
    } else if (sscanf(s, "L %d", &slot) == 1 && slot >= 1 && slot <= DM_PLAYERS) {
        release_player(slot - 1);
    }
}

void netpad_start(void) {
    const char *e = getenv("DM_NETPAD");
    int port = e && *e ? atoi(e) : NETPAD_PORT;
    if (port <= 0 || port > 65535) return;   // DM_NETPAD=0: off
    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (fd < 0) { perror("netpad: socket"); return; }
    struct sockaddr_in a = {.sin_len = sizeof a, .sin_family = AF_INET, .sin_port = htons((uint16_t)port), .sin_addr.s_addr = htonl(INADDR_LOOPBACK)};
    if (bind(fd, (struct sockaddr *)&a, sizeof a) < 0) { fprintf(stderr, "netpad: cannot bind 127.0.0.1:%d (%s)\n", port, strerror(errno)); close(fd); return; }
    fcntl(fd, F_SETFL, fcntl(fd, F_GETFL) | O_NONBLOCK);
    g_rd = dispatch_source_create(DISPATCH_SOURCE_TYPE_READ, (uintptr_t)fd, 0, dispatch_get_main_queue());
    dispatch_source_set_event_handler(g_rd, ^{
        char buf[256]; ssize_t n;
        while ((n = recv(fd, buf, sizeof buf - 1, 0)) > 0) { buf[n] = 0; on_packet(buf); }
    });
    dispatch_resume(g_rd);
    g_tm = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, dispatch_get_main_queue());
    dispatch_source_set_timer(g_tm, dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC / 2), NSEC_PER_SEC / 2, NSEC_PER_SEC / 10);
    dispatch_source_set_event_handler(g_tm, ^{
        double t = now_s();
        for (int p = 0; p < DM_PLAYERS; p++) if (g_seen[p] && t - g_seen[p] > NETPAD_TIMEOUT_S) release_player(p);
    });
    dispatch_resume(g_tm);
    fprintf(stderr, "netpad: phone pads listen on 127.0.0.1:%d\n", port);
}
