export const BUTTON_IDS = [
  "A", "B", "X", "Y",
  "L", "R", "ZL", "ZR",
  "MINUS", "PLUS",
  "UP", "DOWN", "LEFT", "RIGHT",
  "LS", "RS",
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

export const MAX_SLOTS = 4;

export interface StatusEvent {
  pads: number;
  bridges: number;
  /** phones per player slot, index 0 = player 1 */
  slots: number[];
}

/** Events the bridge receives carry the phone that sent them and its player slot (1-4). */
export type Tagged<T> = T & { slot: number; padId: string };

export interface ClientToServerEvents {
  /** slot: requested player (1-4); omitted = lowest free slot */
  hello: (payload: { role: Role; slot?: number }) => void;
  btn: (payload: ButtonEvent) => void;
  stick: (payload: StickEvent) => void;
}

export interface ServerToClientEvents {
  status: (payload: StatusEvent) => void;
  assigned: (payload: { slot: number }) => void;
  btn: (payload: Tagged<ButtonEvent>) => void;
  stick: (payload: Tagged<StickEvent>) => void;
  padJoined: (payload: { padId: string; slot: number }) => void;
  padLeft: (payload: { padId: string }) => void;
}
