// netpad_mac.m - Phone Joy-Con network pads for the NX2Apple Mac host (local patch, see nxpatch/README.md).
//
// Listens on 127.0.0.1:<DM_NETPAD, default 47600> for UDP text datagrams from bridge/bridge.py and feeds them to the host as
// players 1..8 (dm_pad_set_player / dm_pad_players), exactly like physical controllers: each phone becomes its own player, so
// the game's "N players wanted" prompt counts it. Set DM_NETPAD=0 to turn this off.
//
//   P <player 1-8> <buttons> <lx> <ly> <rx> <ry>   buttons = DM_BTN_* bits (dm_input.h), sticks -32767..32767, +y is up
//   L <player>                                     the player left (everything released)
//
//   V <player> <intensity 0-255> <sharpness 0-255>   sent BACK to the address a player's packets came from: the game's rumble for
//                                                    that phone (host refreshes it every 40 ms while non-zero, zero when it stops)
//
// A player that sends nothing for 2 s is released too, so a crashed bridge cannot leave a button held.
#import <Foundation/Foundation.h>
#include <arpa/inet.h>
#include <errno.h>
#include <math.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <os/lock.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>
#include "dm_input.h"
#include "haptics_apple.h"

void controllers_net_players(uint32_t mask);   // controllers_mac.m: ORs these players into dm_pad_players

#define NETPAD_PORT 47600
#define NETPAD_TIMEOUT_S 2.0

static dispatch_source_t g_rd, g_tm;   // kept alive: a dispatch source that ARC releases is cancelled
static double g_seen[DM_PLAYERS];   // last packet time per player, 0 = not a netpad player
static uint32_t g_mask;             // players currently held by phones
static int g_fd = -1;
static struct sockaddr_in g_peer[DM_PLAYERS];   // where each player's packets came from = where its rumble goes (sin_len 0 = unknown)
static os_unfair_lock g_peer_lock = OS_UNFAIR_LOCK_INIT;   // main queue writes, the rumble queue reads
static id g_owner[DM_PLAYERS];      // stable identity for dm_haptics_apple_output (an unchanged owner keeps the route)
static int32_t clampi(long v) { return v > DM_STICK_MAX ? DM_STICK_MAX : v < -DM_STICK_MAX ? -DM_STICK_MAX : (int32_t)v; }
static double now_s(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return (double)t.tv_sec + t.tv_nsec / 1e9; }

static void set_mask(uint32_t m) {
    if (m == g_mask) return;
    g_mask = m;
    controllers_net_players(g_mask);
}
// Game rumble for phone player p -> one UDP datagram back to the bridge. Runs on the host's rumble queue, never on a guest thread.
static void send_rumble(int p, dm_haptic_state s, float gain) {
    dm_haptic_level lv = dm_haptics_level(s.motor, 2, gain);
    float in = dm_haptics_apple_controller_intensity(lv.intensity);   // honours DM_RUMBLE_MIN
    char msg[48];
    int n = snprintf(msg, sizeof msg, "V %d %ld %ld", p + 1, lrintf(fminf(1, fmaxf(0, in)) * 255), lrintf(fminf(1, fmaxf(0, lv.sharpness)) * 255));
    struct sockaddr_in a;
    os_unfair_lock_lock(&g_peer_lock); a = g_peer[p]; os_unfair_lock_unlock(&g_peer_lock);
    if (a.sin_len && g_fd >= 0 && n > 0) sendto(g_fd, msg, (size_t)n, 0, (struct sockaddr *)&a, a.sin_len);   // UDP: a lost update is replaced 40 ms later
}
static void claim_rumble(int p) {
    if (!g_owner[p]) g_owner[p] = [NSObject new];
    dm_haptics_apple_output(p, g_owner[p], ^(dm_haptic_state s, float gain) { send_rumble(p, s, gain); });
}
static void release_player(int p) {
    dm_pad_set_player(p, 0, 0, 0, 0, 0);
    g_seen[p] = 0;
    os_unfair_lock_lock(&g_peer_lock); memset(&g_peer[p], 0, sizeof g_peer[p]); os_unfair_lock_unlock(&g_peer_lock);
    if (g_mask >> p & 1) { fprintf(stderr, "netpad: phone player %d left\n", p + 1); set_mask(g_mask & ~(1u << p)); }
}
static void on_packet(const char *s, const struct sockaddr_in *from) {
    int slot; unsigned long long b; long lx, ly, rx, ry;
    if (sscanf(s, "P %d %llu %ld %ld %ld %ld", &slot, &b, &lx, &ly, &rx, &ry) == 6 && slot >= 1 && slot <= DM_PLAYERS) {
        int p = slot - 1;
        g_seen[p] = now_s();
        os_unfair_lock_lock(&g_peer_lock); g_peer[p] = *from; os_unfair_lock_unlock(&g_peer_lock);
        if (!(g_mask >> p & 1)) {
            claim_rumble(p); fprintf(stderr, "netpad: phone player %d joined\n", slot); set_mask(g_mask | 1u << p); }
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
    g_fd = fd;
    g_rd = dispatch_source_create(DISPATCH_SOURCE_TYPE_READ, (uintptr_t)fd, 0, dispatch_get_main_queue());
    dispatch_source_set_event_handler(g_rd, ^{
        char buf[256]; ssize_t n; struct sockaddr_in from; socklen_t fl;
        for (;;) {
            fl = sizeof from;
            if ((n = recvfrom(fd, buf, sizeof buf - 1, 0, (struct sockaddr *)&from, &fl)) <= 0) break;
            buf[n] = 0; on_packet(buf, &from);
        }
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
