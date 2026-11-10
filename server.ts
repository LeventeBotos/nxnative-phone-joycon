import { createServer } from "node:http";
import os from "node:os";
import next from "next";
import { Server } from "socket.io";
import qrcode from "qrcode-terminal";
import {
  MAX_SLOTS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "./lib/protocol";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = "0.0.0.0";

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) out.push(a.address);
    }
  }
  return out;
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: true },
  });

  const pads = new Map<string, number>(); // socket id -> player slot (1-4)
  const bridges = new Set<string>();

  const slotCounts = () => {
    const c = Array<number>(MAX_SLOTS).fill(0);
    for (const slot of pads.values()) c[slot - 1]++;
    return c;
  };
  const lowestFreeSlot = () => {
    const c = slotCounts();
    const free = c.indexOf(0);
    return (free >= 0 ? free : c.indexOf(Math.min(...c))) + 1;
  };
  const broadcastStatus = () =>
    io.emit("status", { pads: pads.size, bridges: bridges.size, slots: slotCounts() });

  io.on("connection", (socket) => {
    socket.on("hello", ({ role, slot }) => {
      if (role === "bridge") {
        bridges.add(socket.id);
        socket.join("bridge");
        // A bridge that starts late learns about the phones already connected.
        for (const [padId, s] of pads) socket.emit("padJoined", { padId, slot: s });
      } else {
        const wanted = Number.isInteger(slot) && slot! >= 1 && slot! <= MAX_SLOTS ? slot! : lowestFreeSlot();
        if (pads.has(socket.id)) io.to("bridge").emit("padLeft", { padId: socket.id }); // changing slot
        pads.set(socket.id, wanted);
        socket.emit("assigned", { slot: wanted });
        io.to("bridge").emit("padJoined", { padId: socket.id, slot: wanted });
      }
      broadcastStatus();
    });

    socket.on("btn", (e) => {
      const slot = pads.get(socket.id);
      if (slot) io.to("bridge").emit("btn", { ...e, slot, padId: socket.id });
    });
    socket.on("stick", (e) => {
      const slot = pads.get(socket.id);
      if (slot) io.to("bridge").emit("stick", { ...e, slot, padId: socket.id });
    });

    socket.on("disconnect", () => {
      // Only this phone's input is released; other phones keep theirs.
      if (pads.delete(socket.id)) io.to("bridge").emit("padLeft", { padId: socket.id });
      bridges.delete(socket.id);
      broadcastStatus();
    });
  });

  httpServer.listen(port, hostname, () => {
    const ips = lanAddresses();
    console.log(`\n  Phone Joy-Con server (${dev ? "dev" : "production"})`);
    console.log(`  Local:   http://localhost:${port}`);
    if (ips.length === 0) {
      console.log("  Network: no LAN IPv4 address found - are you on Wi-Fi?");
    }
    ips.forEach((ip) => console.log(`  Network: http://${ip}:${port}`));
    if (ips[0]) {
      console.log(`\n  Scan with your phone camera to open the controller:\n`);
      qrcode.generate(`http://${ips[0]}:${port}`, { small: true });
    }
    console.log("\n  Next: run `npm run bridge` in another terminal.\n");
  });
});
