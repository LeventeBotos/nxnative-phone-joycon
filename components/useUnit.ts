"use client";

import { useEffect, useState } from "react";

/** Base button size in px, scaled to the landscape viewport height so every layout fits. */
export function useUnit(factor = 0.16, min = 36, max = 60): number {
  const [u, setU] = useState(48);
  useEffect(() => {
    const fit = () => setU(Math.max(min, Math.min(max, Math.round(window.innerHeight * factor))));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [factor, min, max]);
  return u;
}
