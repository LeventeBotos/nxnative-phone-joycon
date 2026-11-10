"use client";

import DPad from "./DPad";
import Joystick from "./Joystick";
import RotateOverlay from "./RotateOverlay";
import TouchButton from "./TouchButton";
import { useBridgeStatus } from "./useBridgeStatus";

const shoulder = "h-10 w-20 bg-zinc-700 text-zinc-200 rounded-lg text-sm";
const small = "h-8 w-12 bg-zinc-700 text-zinc-300 rounded-full text-xl";
const face = "h-12 w-12 rounded-full bg-zinc-200 text-zinc-900 text-lg";

export default function ProController({ onBack }: { onBack: () => void }) {
  const { dot, label } = useBridgeStatus();

  return (
    <main className="safe-pad relative flex h-full w-full flex-col justify-between gap-1 bg-[#0b0b10]">
      <header className="flex items-center justify-between">
        <div className="flex gap-2">
          <TouchButton id="ZL" className={shoulder}>ZL</TouchButton>
          <TouchButton id="L" className={shoulder}>L</TouchButton>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <TouchButton id="MINUS" className={small}>−</TouchButton>
          <button type="button" onClick={onBack} className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
            {label} · change layout
          </button>
          <TouchButton id="PLUS" className={small}>+</TouchButton>
        </div>
        <div className="flex gap-2">
          <TouchButton id="R" className={shoulder}>R</TouchButton>
          <TouchButton id="ZR" className={shoulder}>ZR</TouchButton>
        </div>
      </header>

      {/* Pro Controller: left stick high, d-pad low; face buttons high, right stick low. */}
      <div className="flex flex-1 items-stretch justify-between px-4">
        <div className="flex gap-6">
          <div className="self-start"><Joystick id="L" size={96} /></div>
          <div className="self-end pb-1"><DPad /></div>
        </div>
        <div className="flex gap-6">
          <div className="self-start">
            <FaceCluster />
          </div>
          <div className="self-end"><Joystick id="R" size={96} /></div>
        </div>
      </div>

      <RotateOverlay />
    </main>
  );
}

function FaceCluster() {
  return (
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
  );
}
