"use client";

import { useState, type ReactNode } from "react";

export type Layout = "pro" | "mariokart" | "joycon-left" | "joycon-right";

function Card({ title, sub, onPick, children }: { title: string; sub: string; onPick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-40 flex-col items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-5 active:scale-95 active:border-zinc-400"
    >
      <div className="flex h-20 items-center justify-center">{children}</div>
      <div className="text-lg font-semibold text-zinc-100">{title}</div>
      <div className="text-xs text-zinc-400">{sub}</div>
    </button>
  );
}

export default function LayoutSelect({ onPick }: { onPick: (l: Layout, slot?: number) => void }) {
  const [slot, setSlot] = useState<number | undefined>(undefined);
  return (
    <main className="safe-pad relative flex h-full w-full flex-col items-center justify-center gap-5 bg-[#0b0b10]">
      <h1 className="text-xl font-semibold text-zinc-100">Choose your controller</h1>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        Player
        {[undefined, 1, 2, 3, 4].map((n) => (
          <button
            key={n ?? "auto"}
            type="button"
            onClick={() => setSlot(n)}
            className={`h-8 min-w-10 rounded-full border px-3 ${
              slot === n ? "border-zinc-100 bg-zinc-100 text-zinc-900" : "border-zinc-600 text-zinc-300"
            }`}
          >
            {n ? `P${n}` : "Auto"}
          </button>
        ))}
      </div>
      <div className="flex gap-4">
        <Card title="Pro Controller" sub="Full one-piece layout" onPick={() => onPick("pro", slot)}>
          <div className="relative h-16 w-28 rounded-[2rem] bg-zinc-700">
            <span className="absolute left-4 top-3 h-5 w-5 rounded-full bg-zinc-900" />
            <span className="absolute bottom-3 left-9 h-4 w-4 rounded bg-zinc-900" />
            <span className="absolute right-9 top-3 h-4 w-4 rounded-full bg-zinc-200" />
            <span className="absolute bottom-3 right-4 h-5 w-5 rounded-full bg-zinc-900" />
          </div>
        </Card>
        <Card title="Mario Kart" sub="Stick, A gas, B back, ZR drift" onPick={() => onPick("mariokart", slot)}>
          <div className="relative h-16 w-28 rounded-2xl bg-zinc-800">
            <span className="absolute bottom-2 left-3 h-6 w-6 rounded-full bg-zinc-500" />
            <span className="absolute bottom-2 right-3 h-8 w-8 rounded-full bg-emerald-400" />
            <span className="absolute bottom-2 right-12 h-5 w-5 rounded-full bg-zinc-300" />
          </div>
        </Card>
        <Card title="Left Joy-Con" sub="Stick, D-pad, L/ZL, minus" onPick={() => onPick("joycon-left", slot)}>
          <div className="h-16 w-24 rounded-l-3xl rounded-r-md bg-[#0ab9e6]" />
        </Card>
        <Card title="Right Joy-Con" sub="ABXY, stick, R/ZR, plus" onPick={() => onPick("joycon-right", slot)}>
          <div className="h-16 w-24 rounded-l-md rounded-r-3xl bg-[#ff3c28]" />
        </Card>
      </div>
    </main>
  );
}
