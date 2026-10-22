import { clamp, lerp, smootherstep } from "./easing";
import { LAST_FRAME } from "./timeline";

export interface Camera {
  x: number;
  y: number;
  spanY: number;
}

interface CameraKey extends Camera {
  frame: number;
}

/**
 * Each beat contains its own move. Keys are shared at the boundaries
 * so the cut never pops, and the previous station stays inside the frame
 * at the start of the next move.
 */
const KEYS: CameraKey[] = [
  { frame: 0, x: 0, y: 520, spanY: 1080 },
  { frame: 149, x: 0, y: 640, spanY: 920 },
  { frame: 230, x: -36, y: 900, spanY: 980 },
  { frame: 299, x: 36, y: 980, spanY: 940 },
  { frame: 420, x: 0, y: 1340, spanY: 1080 },
  { frame: 509, x: 0, y: 1620, spanY: 980 },
  { frame: 610, x: 24, y: 1880, spanY: 1040 },
  { frame: 690, x: 130, y: 1960, spanY: 320 },
  { frame: 749, x: 0, y: 2060, spanY: 1100 },
  { frame: 860, x: 0, y: 2320, spanY: 900 },
  { frame: 960, x: 0, y: 1360, spanY: 2860 },
  { frame: 1019, x: 0, y: 1360, spanY: 2860 },
];

export function cameraAt(frame: number): Camera {
  const f = clamp(frame, 0, LAST_FRAME);
  if (f <= KEYS[0].frame) {
    return { x: KEYS[0].x, y: KEYS[0].y, spanY: KEYS[0].spanY };
  }
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (f <= b.frame) {
      const span = b.frame - a.frame;
      const t = span === 0 ? 1 : smootherstep((f - a.frame) / span);
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        spanY: lerp(a.spanY, b.spanY, t),
      };
    }
  }
  const last = KEYS[KEYS.length - 1];
  return { x: last.x, y: last.y, spanY: last.spanY };
}

export function project(
  cam: Camera,
  cssW: number,
  cssH: number,
  x: number,
  y: number,
): { x: number; y: number; z: number } {
  const z = cssH / cam.spanY;
  return {
    x: cssW / 2 + (x - cam.x) * z,
    y: cssH / 2 + (y - cam.y) * z,
    z,
  };
}
