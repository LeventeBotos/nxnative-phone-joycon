"use client";

import type { ReactNode } from "react";
import type { ButtonId } from "@/lib/protocol";
import TouchButton from "./TouchButton";

export interface DiamondKey {
  id: ButtonId;
  label: ReactNode;
}

interface Props {
  /** top, left, right, bottom */
  keys: [DiamondKey, DiamondKey, DiamondKey, DiamondKey];
  u: number;
  className: string;
  round?: boolean;
}

/** Four buttons in a diamond, each `u` px, used for both the D-pad and ABXY. */
export default function Diamond({ keys, u, className, round = true }: Props) {
  const [top, left, right, bottom] = keys;
  const size = { width: u, height: u };
  const btn = (k: DiamondKey, col: number, row: number) => (
    <TouchButton
      id={k.id}
      style={{ ...size, gridColumn: col, gridRow: row }}
      className={`${round ? "rounded-full" : "rounded-lg"} ${className}`}
    >
      {k.label}
    </TouchButton>
  );
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(3, ${u}px)`, gridTemplateRows: `repeat(3, ${u}px)` }}>
      {btn(top, 2, 1)}
      {btn(left, 1, 2)}
      {btn(right, 3, 2)}
      {btn(bottom, 2, 3)}
    </div>
  );
}
