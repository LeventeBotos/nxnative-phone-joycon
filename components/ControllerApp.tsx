"use client";

import { useState } from "react";
import { enterLandscapeFullscreen } from "@/lib/fullscreen";
import { joinSlot } from "@/lib/socket";
import { randomJoyConColor, type JoyConColor } from "@/lib/joyconColors";
import JoyConController from "./JoyConController";
import LayoutSelect, { type Layout } from "./LayoutSelect";
import ProController from "./ProController";

export default function ControllerApp() {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [color, setColor] = useState<JoyConColor | null>(null);

  const pick = (l: Layout, slot?: number) => {
    joinSlot(slot);
    // The tap is a user gesture, so fullscreen/orientation lock is allowed here.
    void enterLandscapeFullscreen();
    // Pick the colour on the client at selection time (not during SSR) to avoid hydration mismatch.
    if (l !== "pro") setColor(randomJoyConColor());
    setLayout(l);
  };

  if (layout === "pro") return <ProController onBack={() => setLayout(null)} />;
  if (layout && color) {
    return (
      <JoyConController
        side={layout === "joycon-left" ? "left" : "right"}
        color={color}
        onShuffle={() => setColor(randomJoyConColor(color.hex))}
        onBack={() => setLayout(null)}
      />
    );
  }
  return <LayoutSelect onPick={pick} />;
}
