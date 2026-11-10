export interface JoyConColor {
  name: string;
  hex: string;
}

export const JOYCON_COLORS: JoyConColor[] = [
  { name: "Neon Red", hex: "#ff3c28" },
  { name: "Neon Blue", hex: "#0ab9e6" },
  { name: "Neon Green", hex: "#1edc00" },
  { name: "Neon Pink", hex: "#ff3278" },
  { name: "Neon Yellow", hex: "#e6ff00" },
  { name: "Neon Purple", hex: "#b400e6" },
  { name: "Neon Orange", hex: "#ff7a00" },
  { name: "Gray", hex: "#828282" },
  { name: "Turquoise", hex: "#00c3e3" },
  { name: "Mario Red", hex: "#e60012" },
  { name: "Pastel Mint", hex: "#8fd9c0" },
  { name: "Pastel Lilac", hex: "#b9a4e6" },
];

export function randomJoyConColor(exclude?: string): JoyConColor {
  const pool = JOYCON_COLORS.filter((c) => c.hex !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Dark or light ink that reads well on the given hex background. */
export function inkFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#18181b" : "#ffffff";
}
