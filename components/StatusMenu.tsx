"use client";

import { useState } from "react";

interface Props {
  dot: string;
  label: string;
  slot?: number | null;
  info?: string;
  onBack: () => void;
  onShuffle?: () => void;
}

/** Small top-centre pill; tap to open a menu so nothing near the thumbs triggers by accident. */
export default function StatusMenu({ dot, label, slot, info, onBack, onShuffle }: Props) {
  const [open, setOpen] = useState(false);
  const item = "w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-100 active:bg-white/10";
  return (
    <div className="relative z-40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-full bg-black/70 px-3 text-[11px] text-zinc-200"
      >
        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} />
        {slot ? `P${slot}` : "P?"} · {label}
        <span className="text-zinc-500">▾</span>
      </button>
      {open && (
        <div className="absolute left-1/2 top-10 w-44 -translate-x-1/2 rounded-xl bg-black/90 p-1 shadow-lg">
          {info && <div className="px-3 py-1 text-[11px] text-zinc-500">{info}</div>}
          {onShuffle && (
            <button type="button" className={item} onClick={() => { onShuffle(); setOpen(false); }}>
              New colour
            </button>
          )}
          <button type="button" className={item} onClick={onBack}>Change layout</button>
          <button type="button" className={`${item} text-zinc-400`} onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
}
