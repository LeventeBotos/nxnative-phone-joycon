/**
 * Controller-style haptics via the Vibration API.
 * Supported on Android Chrome/Firefox; iOS Safari has no equivalent, so these are no-ops there.
 * Pulses are kept very short so they feel like a click, not a buzz.
 */
const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* vibration blocked (no user gesture / permissions policy) */
  }
};

export const hapticPress = () => buzz(12);
export const hapticRelease = () => buzz(5);
export const hapticStick = () => buzz(8);

const PERIOD_MS = 40; // the host refreshes game rumble every 40 ms while it is non-zero
const MIN_INTENSITY = 0.05; // below this the game is only "texture"; a phone motor would just buzz

/**
 * Game rumble: PWM the motor so intensity maps to duty cycle within each 40 ms refresh.
 * The pattern spans two periods, so a lost "stop" update ends on its own after ~80 ms
 * and a delayed refresh does not leave a gap.
 */
export function hapticRumble(intensity: number) {
  if (!(intensity >= MIN_INTENSITY)) return buzz(0);
  if (intensity >= 0.95) return buzz(PERIOD_MS * 2);
  const on = Math.max(8, Math.round(PERIOD_MS * intensity)); // motors can't do much under ~8 ms
  const off = PERIOD_MS - on;
  buzz([on, off, on, off]);
}
