"use client";

import TouchButton from "./TouchButton";

const base = "h-12 w-12 bg-zinc-700 text-zinc-200 text-xl rounded-md";

export default function DPad() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1">
      <span />
      <TouchButton id="UP" className={base}>▲</TouchButton>
      <span />
      <TouchButton id="LEFT" className={base}>◀</TouchButton>
      <span />
      <TouchButton id="RIGHT" className={base}>▶</TouchButton>
      <span />
      <TouchButton id="DOWN" className={base}>▼</TouchButton>
      <span />
    </div>
  );
}
