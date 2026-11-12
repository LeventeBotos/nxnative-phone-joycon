"use client";

import Diamond from "./Diamond";

/** Switch layout: X top, Y left, A right, B bottom. */
export default function FaceButtons({ u, tone }: { u: number; tone: string }) {
  return (
    <Diamond
      u={u}
      className={`text-lg ${tone}`}
      keys={[
        { id: "X", label: "X" },
        { id: "Y", label: "Y" },
        { id: "A", label: "A" },
        { id: "B", label: "B" },
      ]}
    />
  );
}
