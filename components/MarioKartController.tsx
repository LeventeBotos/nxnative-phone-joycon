"use client";

import { useEffect } from "react";
import { sendButton } from "@/lib/socket";
import { hapticPress } from "@/lib/haptics";
import type { ButtonId } from "@/lib/protocol";
import Joystick from "./Joystick";
import RotateOverlay from "./RotateOverlay";
import StatusMenu from "./StatusMenu";
import TouchButton from "./TouchButton";
import { useBridgeStatus } from "./useBridgeStatus";
import { useUnit } from "./useUnit";

const shoulder = "bg-zinc-700 text-zinc-100 rounded-lg text-sm";
const small = "bg-zinc-700 text-zinc-200 rounded-full text-xl";

/** Phone volume keys -> buttons (only works where the browser forwards them to the page). */
const VOLUME_KEYS: Record<string, ButtonId> = {
  AudioVolumeUp: "ZR",
  VolumeUp: "ZR",
  AudioVolumeDown: "ZL",
  VolumeDown: "ZL",
};

function useVolumeKeys() {
  useEffect(() => {
    const held = new Set<ButtonId>();
    const down = (e: KeyboardEvent) => {
      const id = VOLUME_KEYS[e.key];
      if (!id) return;
      e.preventDefault();
      if (held.has(id)) return;
      held.add(id);
      sendButton({ id, pressed: true });
      hapticPress();
    };
    const up = (e: KeyboardEvent) => {
      const id = VOLUME_KEYS[e.key];
      if (!id) return;
      e.preventDefault();
      held.delete(id);
      sendButton({ id, pressed: false });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      held.forEach((id) => sendButton({ id, pressed: false }));
    };
  }, []);
}

/**
 * Minimal Mario Kart layout: steer with the left stick, ZL = item, ZR = drift,
 * A = gas, B = brake/reverse, X / Y within thumb reach.
 */
export default function MarioKartController({ onBack }: { onBack: () => void }) {
  const { dot, label, slot } = useBridgeStatus();
  useVolumeKeys();
  const u = useUnit(0.14, 34, 52);
  const big = Math.round(u * 2.2);
  const mid = Math.round(u * 1.3);
  const sm = Math.round(u * 1.05);
  const shoulderStyle = { height: Math.round(u * 1.6), width: Math.round(u * 3.4) };
  const smallStyle = { height: Math.round(u * 0.65), width: Math.round(u * 0.85) };

  return (
    <main className="safe-pad relative flex h-full w-full flex-col justify-between bg-[#0b0b10]">
      <header className="relative flex items-start justify-between">
        <TouchButton id="ZL" style={shoulderStyle} className={shoulder}>ITEM</TouchButton>
        <div className="flex items-center gap-2">
          <StatusMenu dot={dot} label={label} slot={slot} onBack={onBack} />
          <TouchButton id="PLUS" style={smallStyle} className={small}>+</TouchButton>
        </div>
        <TouchButton id="ZR" style={shoulderStyle} className={shoulder}>DRIFT</TouchButton>
      </header>

      <div className="flex items-end justify-between px-1">
        <div className="pb-4 pl-10"><Joystick id="L" size={Math.round(u * 2.6)} /></div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-3">
            <TouchButton id="Y" style={{ width: sm, height: sm }} className="rounded-full bg-zinc-200 text-lg text-zinc-900">Y</TouchButton>
            <TouchButton id="X" style={{ width: sm, height: sm }} className="rounded-full bg-zinc-200 text-lg text-zinc-900">X</TouchButton>
          </div>
          <div className="flex items-end gap-3">
            <TouchButton id="B" style={{ width: mid, height: mid }} className="rounded-full bg-zinc-200 text-xl text-zinc-900">B</TouchButton>
            <TouchButton id="A" style={{ width: big, height: big }} className="rounded-full bg-emerald-400 text-4xl font-bold text-zinc-900">A</TouchButton>
          </div>
        </div>
      </div>

      <RotateOverlay />
    </main>
  );
}
