"use client";

import { useEffect, useRef } from "react";
import type { StickId } from "@/lib/protocol";
import { sendStick } from "@/lib/socket";
import { hapticStick } from "@/lib/haptics";

const round = (n: number) => Math.round(n * 100) / 100;

export default function Joystick({
  id,
  size = 130,
  color = "#a1a1aa",
}: {
  id: StickId;
  size?: number;
  color?: string;
}) {
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    let manager: ReturnType<typeof import("nipplejs").create> | undefined;
    let cancelled = false;
    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      raf = 0;
      if (pending) {
        sendStick({ id, ...pending });
        pending = null;
      }
    };
    const queue = (x: number, y: number) => {
      pending = { x, y };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    import("nipplejs").then(({ default: nipplejs }) => {
      if (cancelled) return;
      manager = nipplejs.create({
        zone,
        mode: "static",
        position: { left: "50%", top: "50%" },
        color,
        size,
        restOpacity: 0.7,
        fadeTime: 0,
      });
      manager.on("move", (evt) => {
        queue(round(evt.data.vector.x), round(evt.data.vector.y));
      });
      manager.on("start", () => hapticStick());
      manager.on("end", () => {
        queue(0, 0);
        hapticStick();
      });
    });

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      manager?.destroy();
      sendStick({ id, x: 0, y: 0 });
    };
  }, [id, size, color]);

  return <div ref={zoneRef} className="relative touch-none" style={{ width: size + 30, height: size + 30 }} />;
}
