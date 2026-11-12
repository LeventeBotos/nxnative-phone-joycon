"use client";

import type { CSSProperties } from "react";
import { inkFor, type JoyConColor } from "@/lib/joyconColors";
import DPad from "./DPad";
import FaceButtons from "./FaceButtons";
import Joystick from "./Joystick";
import RotateOverlay from "./RotateOverlay";
import StatusMenu from "./StatusMenu";
import TouchButton from "./TouchButton";
import { useBridgeStatus } from "./useBridgeStatus";
import { useUnit } from "./useUnit";

interface Props {
  side: "left" | "right";
  color: JoyConColor;
  onShuffle: () => void;
  onBack: () => void;
}

const key = "bg-zinc-900 text-zinc-100 shadow-[0_2px_0_rgba(0,0,0,0.45)]";
const tab = "bg-zinc-900/90 text-zinc-100 text-sm rounded-b-md rounded-t-2xl shadow-[0_2px_0_rgba(0,0,0,0.45)]";
const mini = "rounded-full bg-zinc-900 text-zinc-100 text-lg shadow-[0_2px_0_rgba(0,0,0,0.45)]";

/**
 * A single Joy-Con held sideways, filling the phone. Thumbs rest on the bottom
 * corners (stick + buttons), index fingers on the top corners (shoulders).
 */
export default function JoyConController({ side, color, onShuffle, onBack }: Props) {
  const { dot, label, slot } = useBridgeStatus();
  const u = useUnit(0.17, 38, 62);
  const left = side === "left";

  const style = {
    backgroundColor: color.hex,
    color: inkFor(color.hex),
    "--rail": `color-mix(in srgb, ${color.hex} 80%, black)`,
    "--shine": `color-mix(in srgb, ${color.hex} 65%, white)`,
    backgroundImage: `linear-gradient(${left ? 90 : 270}deg, var(--shine) 0%, transparent 14%)`,
    boxShadow: `inset ${left ? "-" : ""}10px 0 0 var(--rail)`,
  } as CSSProperties;

  const tabH = Math.round(u * 0.8);
  const shoulders = left ? (
    <div className="flex gap-2">
      <TouchButton id="ZL" style={{ height: tabH, width: u * 2 }} className={tab}>ZL</TouchButton>
      <TouchButton id="L" style={{ height: tabH, width: u * 1.5 }} className={tab}>L</TouchButton>
    </div>
  ) : (
    <div className="flex gap-2">
      <TouchButton id="R" style={{ height: tabH, width: u * 1.5 }} className={tab}>R</TouchButton>
      <TouchButton id="ZR" style={{ height: tabH, width: u * 2 }} className={tab}>ZR</TouchButton>
    </div>
  );
  const miniSize = { width: Math.round(u * 0.65), height: Math.round(u * 0.65) };
  const system = left ? (
    <TouchButton id="MINUS" style={miniSize} className={mini}>−</TouchButton>
  ) : (
    <TouchButton id="PLUS" style={miniSize} className={mini}>+</TouchButton>
  );

  const stickSize = Math.round(u * 2);
  const stick = (
    <div className="flex flex-col items-center">
      <TouchButton
        id={left ? "LS" : "RS"}
        style={{ height: Math.round(u * 0.5), width: u * 1.1 }}
        className="rounded-full bg-zinc-900 text-zinc-100 text-xs"
      >
        {left ? "L3" : "R3"}
      </TouchButton>
      <Joystick id={left ? "L" : "R"} size={stickSize} color="#18181b" />
    </div>
  );
  const buttons = left ? <DPad u={u} tone={key} /> : <FaceButtons u={u} tone={key} />;

  // Keep clear of the rail on the console-facing edge.
  const rail = left ? "pr-4" : "pl-4";

  return (
    <main style={style} className={`safe-pad relative flex h-full w-full flex-col justify-between ${rail}`}>
      <header className={`relative flex items-start justify-between ${left ? "" : "flex-row-reverse"}`}>
        {shoulders}
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <StatusMenu dot={dot} label={label} slot={slot} info={color.name} onBack={onBack} onShuffle={onShuffle} />
        </div>
        {system}
      </header>

      <div className={`flex items-end justify-between ${left ? "" : "flex-row-reverse"}`}>
        {stick}
        <div className="pb-2">{buttons}</div>
      </div>

      <RotateOverlay />
    </main>
  );
}
