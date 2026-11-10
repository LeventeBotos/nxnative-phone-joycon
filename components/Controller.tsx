"use client";

import { useEffect, useState } from "react";
import type { StatusEvent } from "@/lib/protocol";
import { getSocket } from "@/lib/socket";
import DPad from "./DPad";
import Joystick from "./Joystick";
import TouchButton from "./TouchButton";

const shoulder = "h-10 w-20 bg-zinc-700 text-zinc-200 rounded-lg text-sm";
const small = "h-8 w-12 bg-zinc-700 text-zinc-300 rounded-full text-xl";
const face = "h-12 w-12 rounded-full bg-zinc-200 text-zinc-900 text-lg";

export default function Controller() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<StatusEvent>({ pads: 0, bridges: 0 });

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("status", setStatus);
    // Sync once in case the socket connected before this effect subscribed.
    const t = setTimeout(() => setConnected(s.connected), 0);
    return () => {
      clearTimeout(t);
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("status", setStatus);
    };
  }, []);

  // Best-effort landscape lock + fullscreen on first touch (Android Chrome).
  useEffect(() => {
    const go = async () => {
      try {
        await document.documentElement.requestFullscreen?.();
        await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
      } catch {
        /* unsupported (iOS Safari) - rotate overlay covers it */
      }
    };
    window.addEventListener("touchend", go, { once: true });
    return () => window.removeEventListener("touchend", go);
  }, []);

  const dot = !connected ? "bg-red-500" : status.bridges > 0 ? "bg-green-500" : "bg-amber-400";
  const label = !connected ? "Server offline" : status.bridges > 0 ? "Bridge connected" : "Waiting for Mac bridge";

  return (
    <main className="safe-pad relative flex h-full w-full flex-col justify-between gap-1">
      <header className="flex items-center justify-between">
        <div className="flex gap-2">
          <TouchButton id="ZL" className={shoulder}>ZL</TouchButton>
          <TouchButton id="L" className={shoulder}>L</TouchButton>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <TouchButton id="MINUS" className={small}>−</TouchButton>
          <span className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
            {label}
          </span>
          <TouchButton id="PLUS" className={small}>+</TouchButton>
        </div>
        <div className="flex gap-2">
          <TouchButton id="R" className={shoulder}>R</TouchButton>
          <TouchButton id="ZR" className={shoulder}>ZR</TouchButton>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-4">
          <Joystick id="L" size={110} />
          <DPad />
        </div>
        <div className="flex items-center gap-4">
          <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
            <span />
            <TouchButton id="X" className={face}>X</TouchButton>
            <span />
            <TouchButton id="Y" className={face}>Y</TouchButton>
            <span />
            <TouchButton id="A" className={face}>A</TouchButton>
            <span />
            <TouchButton id="B" className={face}>B</TouchButton>
            <span />
          </div>
          <Joystick id="R" size={110} />
        </div>
      </div>

      <div className="rotate-overlay absolute inset-0 z-50 items-center justify-center bg-black text-center text-lg">
        Rotate your phone to landscape
      </div>
    </main>
  );
}
