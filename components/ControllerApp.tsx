"use client";

import { useState } from "react";
import { enterLandscapeFullscreen } from "@/lib/fullscreen";
import { randomJoyConColor, type JoyConColor } from "@/lib/joyconColors";
import JoyConController from "./JoyConController";
import LayoutSelect, { type Layout } from "./LayoutSelect";
import ProController from "./ProController";

export default function ControllerApp() {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [color, setColor] = useState<JoyConColor | null>(null);

  const pick = (l: Layout) => {
    // The tap is a user gesture, so fullscreen/orientation lock is allowed here.
    void enterLandscapeFullscreen();
    // Pick the colour on the client at selection time (not during SSR) to avoid hydration mismatch.
    if (l === "joycon") setColor(randomJoyConColor());
    setLayout(l);
  };

  if (layout === "pro") return <ProController onBack={() => setLayout(null)} />;
  if (layout === "joycon" && color) {
    return (
      <JoyConController
        color={color}
        onShuffle={() => setColor(randomJoyConColor(color.hex))}
        onBack={() => setLayout(null)}
      />
    );
  }
  return <LayoutSelect onPick={pick} />;
}
