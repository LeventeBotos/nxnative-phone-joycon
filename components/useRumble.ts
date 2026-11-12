"use client";

import { useEffect } from "react";
import { hapticRumble } from "@/lib/haptics";
import type { RumbleEvent } from "@/lib/protocol";
import { getSocket } from "@/lib/socket";

/** Makes the phone vibrate when the game rumbles (host -> bridge -> server -> this phone). */
export function useRumble() {
  useEffect(() => {
    const s = getSocket();
    const onRumble = (e: RumbleEvent) => hapticRumble(e.intensity);
    s.on("rumble", onRumble);
    return () => {
      s.off("rumble", onRumble);
      hapticRumble(0);
    };
  }, []);
}
