"use client";

import { useEffect, useState } from "react";
import type { StatusEvent } from "@/lib/protocol";
import { getSocket } from "@/lib/socket";

export function useBridgeStatus() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<StatusEvent>({ pads: 0, bridges: 0, slots: [] });
  const [slot, setSlot] = useState<number | null>(null);

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("status", setStatus);
    const onAssigned = ({ slot }: { slot: number }) => setSlot(slot);
    s.on("assigned", onAssigned);
    // Sync once in case the socket connected before this effect subscribed.
    const t = setTimeout(() => setConnected(s.connected), 0);
    return () => {
      clearTimeout(t);
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("status", setStatus);
      s.off("assigned", onAssigned);
    };
  }, []);

  const dot = !connected ? "bg-red-500" : status.bridges > 0 ? "bg-green-500" : "bg-amber-400";
  const label = !connected ? "Server offline" : status.bridges > 0 ? "Bridge connected" : "Waiting for Mac bridge";
  return { dot, label, slot };
}
