"use client";

import Diamond from "./Diamond";

export default function DPad({ u, tone = "bg-zinc-700 text-zinc-200" }: { u: number; tone?: string }) {
  return (
    <Diamond
      u={u}
      round={false}
      className={`text-lg ${tone}`}
      keys={[
        { id: "UP", label: "▲" },
        { id: "LEFT", label: "◀" },
        { id: "RIGHT", label: "▶" },
        { id: "DOWN", label: "▼" },
      ]}
    />
  );
}
