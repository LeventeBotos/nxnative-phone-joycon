// vpad: creates virtual HID gamepads (IOHIDUserDevice), one per player slot, driven by line
// commands on stdin from bridge/bridge.py:
//   probe                                   -> "ok probe" / "err probe" (can this process create a device?)
//   join <slot>      (1-4)                  -> a gamepad "Phone Joy-Con P<slot>" appears
//   leave <slot>                            -> it disappears
//   rep <slot> <buttons> <hat> <lx> <ly> <rx> <ry>   -> one input report
// EOF on stdin destroys every device and exits. --dry-run prints reports instead of using IOKit.
//
// Creating the device needs the com.apple.developer.hid.virtual.device entitlement (see README).
// The report layout matches NX2Apple's generic HID reader (dm/host/pad_hid.h) and bridge/hid_report.py.
#include <CoreFoundation/CoreFoundation.h>
#include <dispatch/dispatch.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Not in the public SDK headers; exported by IOKit.framework.
typedef struct __IOHIDUserDevice *IOHIDUserDeviceRef;
extern IOHIDUserDeviceRef IOHIDUserDeviceCreateWithProperties(CFAllocatorRef, CFDictionaryRef, uint32_t);
extern int IOHIDUserDeviceHandleReport(IOHIDUserDeviceRef, const uint8_t *, CFIndex);
extern void IOHIDUserDeviceSetDispatchQueue(IOHIDUserDeviceRef, dispatch_queue_t);
extern void IOHIDUserDeviceActivate(IOHIDUserDeviceRef);
extern void IOHIDUserDeviceCancel(IOHIDUserDeviceRef);

#define SLOTS 4
#define VENDOR 0x1209    // pid.codes open-source VID; each slot gets its own PID so NX2Apple sees 4 different models
#define PID_BASE 0x7000

static const uint8_t kDescriptor[] = {
    0x05, 0x01, 0x09, 0x05, 0xA1, 0x01,                                      // Generic Desktop, Game Pad, Application collection
    0x05, 0x09, 0x19, 0x01, 0x29, 0x10, 0x15, 0x00, 0x25, 0x01,              // Buttons 1..16, 0..1
    0x75, 0x01, 0x95, 0x10, 0x81, 0x02,                                      //   16 x 1 bit, Data/Var/Abs
    0x05, 0x01, 0x09, 0x39, 0x15, 0x00, 0x25, 0x07,                          // Hat switch 0..7
    0x35, 0x00, 0x46, 0x3B, 0x01, 0x65, 0x14, 0x75, 0x04, 0x95, 0x01,        //   0..315 degrees, 4 bits
    0x81, 0x42,                                                              //   Data/Var/Abs/Null state (8 = centred)
    0x75, 0x04, 0x95, 0x01, 0x81, 0x03,                                      // 4 bits padding
    0x05, 0x01, 0x09, 0x30, 0x09, 0x31, 0x09, 0x32, 0x09, 0x35,              // X, Y, Z, Rz
    0x15, 0x00, 0x27, 0xFF, 0xFF, 0x00, 0x00, 0x75, 0x10, 0x95, 0x04,        //   0..65535, 4 x 16 bit
    0x81, 0x02,
    0xC0,
};
// Report (no report id), 11 bytes little-endian: buttons u16 | hat u8 (low 4 bits) | lx ly rx ry u16

static IOHIDUserDeviceRef g_dev[SLOTS + 1];
static dispatch_queue_t g_queue;
static int g_dry;

static void put_num(CFMutableDictionaryRef d, CFStringRef key, int v) {
    CFNumberRef n = CFNumberCreate(NULL, kCFNumberIntType, &v);
    CFDictionarySetValue(d, key, n);
    CFRelease(n);
}

static IOHIDUserDeviceRef create_device(int slot) {
    CFMutableDictionaryRef p = CFDictionaryCreateMutable(NULL, 0, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    CFDataRef desc = CFDataCreate(NULL, kDescriptor, sizeof kDescriptor);
    char name[64], serial[32];
    snprintf(name, sizeof name, "Phone Joy-Con P%d", slot);
    snprintf(serial, sizeof serial, "PJC-%d", slot);
    CFStringRef cname = CFStringCreateWithCString(NULL, name, kCFStringEncodingUTF8);
    CFStringRef cserial = CFStringCreateWithCString(NULL, serial, kCFStringEncodingUTF8);
    CFDictionarySetValue(p, CFSTR("ReportDescriptor"), desc);
    CFDictionarySetValue(p, CFSTR("Product"), cname);
    CFDictionarySetValue(p, CFSTR("SerialNumber"), cserial);
    CFDictionarySetValue(p, CFSTR("Manufacturer"), CFSTR("phone-joycon"));
    CFDictionarySetValue(p, CFSTR("Transport"), CFSTR("USB"));
    put_num(p, CFSTR("VendorID"), VENDOR);
    put_num(p, CFSTR("ProductID"), PID_BASE + slot);
    put_num(p, CFSTR("VersionNumber"), 1);
    IOHIDUserDeviceRef dev = IOHIDUserDeviceCreateWithProperties(kCFAllocatorDefault, p, 0);
    CFRelease(p); CFRelease(desc); CFRelease(cname); CFRelease(cserial);
    if (dev) { IOHIDUserDeviceSetDispatchQueue(dev, g_queue); IOHIDUserDeviceActivate(dev); }
    return dev;
}

static void destroy_device(int slot) {
    if (!g_dev[slot]) return;
    IOHIDUserDeviceCancel(g_dev[slot]);
    CFRelease(g_dev[slot]);
    g_dev[slot] = NULL;
}

static void put16(uint8_t *b, unsigned v) { b[0] = v & 0xFF; b[1] = (v >> 8) & 0xFF; }

int main(int argc, char **argv) {
    g_dry = argc > 1 && !strcmp(argv[1], "--dry-run");
    g_queue = dispatch_queue_create("phone-joycon.vpad", DISPATCH_QUEUE_SERIAL);
    setvbuf(stdout, NULL, _IOLBF, 0);
    char line[256];
    while (fgets(line, sizeof line, stdin)) {
        int slot = 0;
        unsigned btn, hat, lx, ly, rx, ry;
        if (!strncmp(line, "probe", 5)) {
            if (g_dry) { puts("ok probe"); continue; }
            IOHIDUserDeviceRef d = create_device(0);
            if (d) { IOHIDUserDeviceCancel(d); CFRelease(d); puts("ok probe"); } else puts("err probe");
        } else if (sscanf(line, "join %d", &slot) == 1 && slot >= 1 && slot <= SLOTS) {
            if (g_dry) { printf("join %d\n", slot); continue; }
            if (!g_dev[slot]) g_dev[slot] = create_device(slot);
            printf(g_dev[slot] ? "ok join %d\n" : "err join %d\n", slot);
        } else if (sscanf(line, "leave %d", &slot) == 1 && slot >= 1 && slot <= SLOTS) {
            if (g_dry) { printf("leave %d\n", slot); continue; }
            destroy_device(slot);
        } else if (sscanf(line, "rep %d %u %u %u %u %u %u", &slot, &btn, &hat, &lx, &ly, &rx, &ry) == 7 && slot >= 1 && slot <= SLOTS) {
            uint8_t r[11];
            put16(r, btn); r[2] = hat & 0x0F; put16(r + 3, lx); put16(r + 5, ly); put16(r + 7, rx); put16(r + 9, ry);
            if (g_dry) {
                printf("rep %d ", slot);
                for (int i = 0; i < 11; i++) printf("%02x", r[i]);
                putchar('\n');
            } else if (g_dev[slot]) IOHIDUserDeviceHandleReport(g_dev[slot], r, sizeof r);
        }
    }
    for (int s = 1; s <= SLOTS; s++) destroy_device(s);
    return 0;
}
