"use client";

import TouchButton from "./TouchButton";

const DEFAULT = "bg-zinc-700 text-zinc-200";

export default function DPad({ tone = DEFAULT }: { tone?: string }) {
  const base = `h-11 w-11 text-xl rounded-md ${tone}`;
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
