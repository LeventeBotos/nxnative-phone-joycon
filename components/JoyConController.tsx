"use client";

import type { CSSProperties } from "react";
import { inkFor, type JoyConColor } from "@/lib/joyconColors";
import DPad from "./DPad";
import Joystick from "./Joystick";
import RotateOverlay from "./RotateOverlay";
import TouchButton from "./TouchButton";
import { useBridgeStatus } from "./useBridgeStatus";

interface Props {
  color: JoyConColor;
  onShuffle: () => void;
  onBack: () => void;
}

const key = "bg-zinc-900 text-zinc-100 shadow-[0_2px_0_rgba(0,0,0,0.45)]";
const tab = "h-10 w-24 bg-zinc-900/90 text-zinc-100 text-sm shadow-[0_2px_0_rgba(0,0,0,0.45)]";
const mini = "h-7 w-7 rounded-full bg-zinc-900 text-zinc-100 text-base shadow-[0_2px_0_rgba(0,0,0,0.45)]";

export default function JoyConController({ color, onShuffle, onBack }: Props) {
  const { dot, label } = useBridgeStatus();
  const ink = inkFor(color.hex);

  const style = {
    backgroundColor: color.hex,
    color: ink,
    "--rail": `color-mix(in srgb, ${color.hex} 82%, black)`,
    "--shine": `color-mix(in srgb, ${color.hex} 70%, white)`,
  } as CSSProperties;

  // Each half is a rounded Joy-Con body with a darker rail on its inner edge.
  const body = "relative flex h-full flex-1 flex-col items-center justify-between py-2";

  return (
    <main style={style} className="safe-pad relative flex h-full w-full gap-3">
      {/* Left Joy-Con */}
      <section
        className={`${body} rounded-l-[2.5rem] rounded-r-xl`}
        style={{ background: "linear-gradient(90deg, var(--shine) 0%, transparent 18%)", boxShadow: "inset -6px 0 0 var(--rail)" }}
      >
        <div className="flex w-full items-center justify-between px-4">
          <div className="flex gap-2">
            <TouchButton id="ZL" className={`${tab} rounded-b-md rounded-t-2xl`}>ZL</TouchButton>
            <TouchButton id="L" className={`${tab} w-16 rounded-b-md rounded-t-2xl`}>L</TouchButton>
          </div>
          <TouchButton id="MINUS" className={mini}>−</TouchButton>
        </div>
        <Joystick id="L" size={88} color="#18181b" />
        <DPad tone={key} />
      </section>

      {/* Centre: status + colour shuffle */}
      <section className="flex w-36 flex-col items-center justify-center gap-3 rounded-2xl bg-black/80 px-2 text-center text-[11px] leading-tight text-zinc-300">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
          {label}
        </span>
        <span className="text-zinc-500">{color.name}</span>
        <button type="button" onClick={onShuffle} className="rounded-full border border-zinc-600 px-3 py-1.5 text-zinc-200">
          New colour
        </button>
        <button type="button" onClick={onBack} className="text-zinc-500 underline">
          Change layout
        </button>
      </section>

      {/* Right Joy-Con */}
      <section
        className={`${body} rounded-l-xl rounded-r-[2.5rem]`}
        style={{ background: "linear-gradient(270deg, var(--shine) 0%, transparent 18%)", boxShadow: "inset 6px 0 0 var(--rail)" }}
      >
        <div className="flex w-full items-center justify-between px-4">
          <TouchButton id="PLUS" className={mini}>+</TouchButton>
          <div className="flex gap-2">
            <TouchButton id="R" className={`${tab} w-16 rounded-b-md rounded-t-2xl`}>R</TouchButton>
            <TouchButton id="ZR" className={`${tab} rounded-b-md rounded-t-2xl`}>ZR</TouchButton>
          </div>
        </div>
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
          <span />
          <TouchButton id="X" className={`h-11 w-11 rounded-full ${key}`}>X</TouchButton>
          <span />
          <TouchButton id="Y" className={`h-11 w-11 rounded-full ${key}`}>Y</TouchButton>
          <span />
          <TouchButton id="A" className={`h-11 w-11 rounded-full ${key}`}>A</TouchButton>
          <span />
          <TouchButton id="B" className={`h-11 w-11 rounded-full ${key}`}>B</TouchButton>
          <span />
        </div>
        <Joystick id="R" size={88} color="#18181b" />
      </section>

      <RotateOverlay />
    </main>
  );
}
