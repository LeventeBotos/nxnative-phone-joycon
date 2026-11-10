import { createServer } from "node:http";
import os from "node:os";
import next from "next";
import { Server } from "socket.io";
import qrcode from "qrcode-terminal";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
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

  const pads = new Set<string>();
  const bridges = new Set<string>();
  const broadcastStatus = () =>
    io.emit("status", { pads: pads.size, bridges: bridges.size });

  io.on("connection", (socket) => {
    socket.on("hello", ({ role }) => {
      if (role === "bridge") {
        bridges.add(socket.id);
        socket.join("bridge");
      } else {
        pads.add(socket.id);
      }
      broadcastStatus();
    });

    socket.on("btn", (e) => {
      if (pads.has(socket.id)) io.to("bridge").emit("btn", e);
    });
    socket.on("stick", (e) => {
      if (pads.has(socket.id)) io.to("bridge").emit("stick", e);
    });

    socket.on("disconnect", () => {
      const wasPad = pads.delete(socket.id);
      bridges.delete(socket.id);
      // Avoid stuck keys if a controller vanishes mid-press.
      if (wasPad) io.to("bridge").emit("releaseAll");
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
