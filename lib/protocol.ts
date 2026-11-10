export const BUTTON_IDS = [
  "A", "B", "X", "Y",
  "L", "R", "ZL", "ZR",
  "MINUS", "PLUS",
  "UP", "DOWN", "LEFT", "RIGHT",
] as const;

export type ButtonId = (typeof BUTTON_IDS)[number];
export type StickId = "L" | "R";
export type Role = "pad" | "bridge";

export interface ButtonEvent {
  id: ButtonId;
  pressed: boolean;
}

export interface StickEvent {
  id: StickId;
  /** -1 (left) .. 1 (right) */
  x: number;
  /** -1 (down) .. 1 (up) */
  y: number;
}

export interface StatusEvent {
  pads: number;
  bridges: number;
}

export interface ClientToServerEvents {
  hello: (payload: { role: Role }) => void;
  btn: (payload: ButtonEvent) => void;
  stick: (payload: StickEvent) => void;
}

export interface ServerToClientEvents {
  status: (payload: StatusEvent) => void;
  btn: (payload: ButtonEvent) => void;
  stick: (payload: StickEvent) => void;
  releaseAll: () => void;
}
