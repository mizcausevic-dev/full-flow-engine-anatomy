export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Ken Perlin's smootherstep. Zero first and second derivative at the ends. */
export function smootherstep(value: number): number {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function reveal(frame: number, enter: number, exit: number): number {
  if (frame < enter || frame > exit) return 0;
  const fade = 10;
  const inn = smootherstep((frame - enter) / fade);
  const out = smootherstep((exit - frame) / fade);
  return Math.min(inn, out);
}
