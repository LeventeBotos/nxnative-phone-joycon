"use client";

import type { CSSProperties } from "react";
import { inkFor, type JoyConColor } from "@/lib/joyconColors";
import DPad from "./DPad";
import Joystick from "./Joystick";
import RotateOverlay from "./RotateOverlay";
import TouchButton from "./TouchButton";
import { useBridgeStatus } from "./useBridgeStatus";

interface Props {
  side: "left" | "right";
  color: JoyConColor;
  onShuffle: () => void;
  onBack: () => void;
}

const key = "bg-zinc-900 text-zinc-100 shadow-[0_2px_0_rgba(0,0,0,0.45)]";
const tab = "h-11 bg-zinc-900/90 text-zinc-100 text-sm rounded-b-md rounded-t-2xl shadow-[0_2px_0_rgba(0,0,0,0.45)]";
const mini = "h-8 w-8 rounded-full bg-zinc-900 text-zinc-100 text-lg shadow-[0_2px_0_rgba(0,0,0,0.45)]";
const faceKey = `h-14 w-14 rounded-full text-lg ${key}`;

function FaceButtons() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1">
      <span />
      <TouchButton id="X" className={faceKey}>X</TouchButton>
      <span />
      <TouchButton id="Y" className={faceKey}>Y</TouchButton>
      <span />
      <TouchButton id="A" className={faceKey}>A</TouchButton>
      <span />
      <TouchButton id="B" className={faceKey}>B</TouchButton>
      <span />
    </div>
  );
}

/** A single Joy-Con held sideways, filling the whole phone screen. */
export default function JoyConController({ side, color, onShuffle, onBack }: Props) {
  const { dot, label } = useBridgeStatus();
  const left = side === "left";

  const style = {
    backgroundColor: color.hex,
    color: inkFor(color.hex),
    "--rail": `color-mix(in srgb, ${color.hex} 80%, black)`,
    "--shine": `color-mix(in srgb, ${color.hex} 65%, white)`,
    // Highlight on the outer edge, darker rail where the Joy-Con would slide onto the console.
    backgroundImage: `linear-gradient(${left ? 90 : 270}deg, var(--shine) 0%, transparent 14%)`,
    boxShadow: `inset ${left ? "-" : ""}10px 0 0 var(--rail)`,
  } as CSSProperties;

  const shoulders = left ? (
    <div className="flex items-center gap-2">
      <TouchButton id="ZL" className={`${tab} w-28`}>ZL</TouchButton>
      <TouchButton id="L" className={`${tab} w-20`}>L</TouchButton>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <TouchButton id="R" className={`${tab} w-20`}>R</TouchButton>
      <TouchButton id="ZR" className={`${tab} w-28`}>ZR</TouchButton>
    </div>
  );
  const system = left ? (
    <TouchButton id="MINUS" className={mini}>−</TouchButton>
  ) : (
    <TouchButton id="PLUS" className={mini}>+</TouchButton>
  );

  const stick = <Joystick id={left ? "L" : "R"} size={110} color="#18181b" />;
  const buttons = left ? <DPad tone={`${key} h-14 w-14`} /> : <FaceButtons />;

  return (
    <main style={style} className="safe-pad relative flex h-full w-full flex-col justify-between">
      <header className={`flex items-center justify-between gap-4 ${left ? "pr-5" : "flex-row-reverse pl-5"}`}>
        {shoulders}
        {system}
      </header>

      <div className={`flex flex-1 items-center justify-between gap-3 ${left ? "pr-5" : "flex-row-reverse pl-5"}`}>
        {stick}

        <section className="flex w-32 flex-col items-center gap-2 rounded-2xl bg-black/80 px-2 py-3 text-center text-[11px] leading-tight text-zinc-300">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
            {label}
          </span>
          <span className="text-zinc-500">{color.name}</span>
          <button type="button" onClick={onShuffle} className="rounded-full border border-zinc-600 px-3 py-1 text-zinc-200">
            New colour
          </button>
          <button type="button" onClick={onBack} className="text-zinc-500 underline">
            Change layout
          </button>
        </section>

        {buttons}
      </div>

      <RotateOverlay />
    </main>
  );
}
