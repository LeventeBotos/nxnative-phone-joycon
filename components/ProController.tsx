"use client";

import DPad from "./DPad";
import FaceButtons from "./FaceButtons";
import Joystick from "./Joystick";
import RotateOverlay from "./RotateOverlay";
import StatusMenu from "./StatusMenu";
import TouchButton from "./TouchButton";
import { useBridgeStatus } from "./useBridgeStatus";
import { useUnit } from "./useUnit";

const shoulder = "bg-zinc-700 text-zinc-200 rounded-lg text-sm";
const small = "bg-zinc-700 text-zinc-300 rounded-full text-xl";
const click = "rounded-full bg-zinc-800 text-zinc-300 text-xs";
const face = "bg-zinc-200 text-zinc-900";

/**
 * Pro Controller sized to the viewport. Thumbs live in the bottom corners
 * (stick outside, D-pad / face buttons inside); shoulders on the top corners.
 */
export default function ProController({ onBack }: { onBack: () => void }) {
  const { dot, label, slot } = useBridgeStatus();
  const u = useUnit(0.14, 34, 52);
  const stickSize = Math.round(u * 2);
  const shoulderStyle = { height: Math.round(u * 0.85), width: Math.round(u * 1.5) };
  const smallStyle = { height: Math.round(u * 0.65), width: Math.round(u * 0.85) };
  const clickStyle = { height: Math.round(u * 0.5), width: Math.round(u * 1.1) };

  return (
    <main className="safe-pad relative flex h-full w-full flex-col justify-between bg-[#0b0b10]">
      <header className="relative flex items-start justify-between">
        <div className="flex gap-2">
          <TouchButton id="ZL" style={shoulderStyle} className={shoulder}>ZL</TouchButton>
          <TouchButton id="L" style={shoulderStyle} className={shoulder}>L</TouchButton>
        </div>
        <div className="flex items-center gap-2">
          <TouchButton id="MINUS" style={smallStyle} className={small}>−</TouchButton>
          <StatusMenu dot={dot} label={label} slot={slot} onBack={onBack} />
          <TouchButton id="PLUS" style={smallStyle} className={small}>+</TouchButton>
        </div>
        <div className="flex gap-2">
          <TouchButton id="R" style={shoulderStyle} className={shoulder}>R</TouchButton>
          <TouchButton id="ZR" style={shoulderStyle} className={shoulder}>ZR</TouchButton>
        </div>
      </header>

      <div className="flex items-end justify-between px-1">
        <div className="flex items-end gap-3">
          <div className="flex flex-col items-center">
            <TouchButton id="LS" style={clickStyle} className={click}>L3</TouchButton>
            <Joystick id="L" size={stickSize} />
          </div>
          <div className="pb-2"><DPad u={u} /></div>
        </div>
        <div className="flex items-end gap-3">
          <div className="pb-2"><FaceButtons u={u} tone={face} /></div>
          <div className="flex flex-col items-center">
            <TouchButton id="RS" style={clickStyle} className={click}>R3</TouchButton>
            <Joystick id="R" size={stickSize} />
          </div>
        </div>
      </div>

      <RotateOverlay />
    </main>
  );
}
