"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ButtonId } from "@/lib/protocol";
import { sendButton } from "@/lib/socket";

interface Props {
  id: ButtonId;
  children: ReactNode;
  className?: string;
}

/**
 * Press-and-hold button. Uses native touchstart/touchend listeners
 * (non-passive) so there is no tap delay and no scroll/zoom interference.
 * Mouse handlers are a desktop-testing fallback.
 */
export default function TouchButton({ id, children, className = "" }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = new Set<number>();

    const press = () => {
      setDown(true);
      sendButton({ id, pressed: true });
      navigator.vibrate?.(8);
    };
    const release = () => {
      setDown(false);
      sendButton({ id, pressed: false });
    };

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const was = active.size;
      for (const t of Array.from(e.changedTouches)) active.add(t.identifier);
      if (was === 0 && active.size > 0) press();
    };
    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      const was = active.size;
      for (const t of Array.from(e.changedTouches)) active.delete(t.identifier);
      if (was > 0 && active.size === 0) release();
    };
    const onMouseDown = () => press();
    const onMouseUp = () => release();

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    el.addEventListener("touchcancel", onEnd, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseUp);
      if (active.size > 0) sendButton({ id, pressed: false });
    };
  }, [id]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={id}
      className={`flex items-center justify-center font-bold select-none touch-none transition-transform ${
        down ? "scale-90 brightness-150" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}
