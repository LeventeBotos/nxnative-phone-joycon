import { io, type Socket } from "socket.io-client";
import type {
  ButtonEvent,
  ClientToServerEvents,
  ServerToClientEvents,
  StickEvent,
} from "./protocol";

export type PadSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: PadSocket | null = null;
let requestedSlot: number | undefined;

export function getSocket(): PadSocket {
  if (!socket) {
    socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket?.emit("hello", { role: "pad", slot: requestedSlot }));
  }
  return socket;
}

export const sendButton = (e: ButtonEvent) => getSocket().volatile.emit("btn", e);
export const sendStick = (e: StickEvent) => getSocket().volatile.emit("stick", e);

/** Joins (or switches to) a player slot 1-4; undefined = lowest free slot. */
export function joinSlot(slot?: number) {
  requestedSlot = slot;
  const s = getSocket();
  if (s.connected) s.emit("hello", { role: "pad", slot });
}
