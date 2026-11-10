/** Best-effort fullscreen + landscape lock. Must run inside a user gesture. Unsupported on iOS Safari. */
export async function enterLandscapeFullscreen(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen?.();
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.("landscape");
  } catch {
    /* unsupported - the rotate overlay covers it */
  }
}
