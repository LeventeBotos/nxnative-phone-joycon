// Harness for netpad_mac.m: stands in for the host's input functions and prints what the module does.
#import <Foundation/Foundation.h>
#include <stdint.h>
#include <stdio.h>
void dm_pad_set_player(int p, uint64_t b, int32_t lx, int32_t ly, int32_t rx, int32_t ry) {
    printf("set player=%d buttons=%llu l=(%d,%d) r=(%d,%d)\n", p + 1, (unsigned long long)b, lx, ly, rx, ry); fflush(stdout);
}
void controllers_net_players(uint32_t m) { printf("players mask=0x%02x\n", m); fflush(stdout); }
void netpad_start(void);
int main(void) {
    netpad_start();
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 8 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{ exit(0); });
    dispatch_main();   // services the main queue like the host's main thread does
}
