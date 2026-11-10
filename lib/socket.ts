import { io, type Socket } from "socket.io-client";
import type {
  ButtonEvent,
  ClientToServerEvents,
  ServerToClientEvents,
  StickEvent,
} from "./protocol";

export type PadSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: PadSocket | null = null;

export function getSocket(): PadSocket {
  if (!socket) {
    socket = io({ transports: ["websocket"] });
    socket.on("connect", () => socket?.emit("hello", { role: "pad" }));
  }
  return socket;
}

export const sendButton = (e: ButtonEvent) => getSocket().volatile.emit("btn", e);
export const sendStick = (e: StickEvent) => getSocket().volatile.emit("stick", e);
