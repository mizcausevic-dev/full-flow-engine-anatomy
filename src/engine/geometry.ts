import { clamp01, lerp, smootherstep } from "./easing";

/**
 * Drawing units are plate units, not millimetres of hardware.
 * Left/right clocking is a schematic so both circuits stay readable.
 * It is not a claim about a flight engine's arrangement.
 */
export const LM = {
  top: 70,
  tankFlange: 150,
  pumpY: 460,
  pumpR: 86,
  splitY: 690,
  oxMinorY: 620,
  fuelMinorY: 740,
  preTop: 820,
  preBot: 1040,
  turbY: 1220,
  turbR: 74,
  ductY: 1360,
  injTop: 1488,
  injFace: 1540,
  barrelEnd: 1760,
  throatY: 2060,
  exitY: 2580,
  bottom: 2660,
  ox: -410,
  fuel: 410,
  chamberR: 108,
  throatR: 46,
  exitR: 250,
  downcomerX: 500,
} as const;

export function boreRadius(y: number): number {
  if (y <= LM.barrelEnd) return LM.chamberR;
  if (y <= LM.throatY) {
    const t = smootherstep((y - LM.barrelEnd) / (LM.throatY - LM.barrelEnd));
    return lerp(LM.chamberR, LM.throatR, t);
  }
  const t = clamp01((y - LM.throatY) / (LM.exitY - LM.throatY));
  return lerp(LM.throatR, LM.exitR, Math.pow(t, 0.58));
}

/** Thicker near the throat. Qualitative, not a measured wall. */
export function wallThickness(y: number): number {
  const d = (y - LM.throatY) / 200;
  return 28 + 16 * Math.exp(-d * d);
}

export function outerRadius(y: number): number {
  return boreRadius(y) + wallThickness(y);
}

export interface Pt {
  x: number;
  y: number;
}

export type Fluid = "lox" | "methane" | "ox-gas" | "fuel-gas";
export type Pathway = "feed" | "majority" | "minority" | "gas" | "coolant";

export interface Duct {
  id: string;
  pts: Pt[];
  bore: number;
  fluid: Fluid;
  pathway: Pathway;
  /** Chevron spacing in plate units. */
  spacing: number;
}

const ox = LM.ox;
const fuel = LM.fuel;

function line(id: string, pts: Pt[], bore: number, fluid: Fluid, pathway: Pathway, spacing = 36): Duct {
  return { id, pts, bore, fluid, pathway, spacing };
}

export const DUCTS: Duct[] = [
  line("lox-feed", [
    { x: ox, y: LM.tankFlange },
    { x: ox, y: LM.pumpY - LM.pumpR },
  ], 13, "lox", "feed"),
  line("meth-feed", [
    { x: fuel, y: LM.tankFlange },
    { x: fuel, y: LM.pumpY - LM.pumpR },
  ], 13, "methane", "feed"),
  line("ox-majority", [
    { x: ox, y: LM.pumpY + LM.pumpR },
    { x: ox, y: LM.preTop },
  ], 15, "lox", "majority"),
  line("fuel-majority", [
    { x: fuel, y: LM.pumpY + LM.pumpR },
    { x: fuel, y: LM.preTop },
  ], 15, "methane", "majority"),
  line("ox-minority", [
    { x: ox, y: LM.splitY },
    { x: ox, y: LM.oxMinorY },
    { x: fuel - 58, y: LM.oxMinorY },
    { x: fuel - 58, y: LM.preTop },
  ], 5, "lox", "minority", 28),
  line("fuel-minority", [
    { x: fuel, y: LM.splitY },
    { x: fuel, y: LM.fuelMinorY },
    { x: ox + 58, y: LM.fuelMinorY },
    { x: ox + 58, y: LM.preTop },
  ], 5, "methane", "minority", 28),
  line("ox-pre-to-turb", [
    { x: ox, y: LM.preBot },
    { x: ox, y: LM.turbY - LM.turbR },
  ], 12, "ox-gas", "gas"),
  line("fuel-pre-to-turb", [
    { x: fuel, y: LM.preBot },
    { x: fuel, y: LM.turbY - LM.turbR },
  ], 12, "fuel-gas", "gas"),
  line("ox-gas-to-chamber", [
    { x: ox, y: LM.turbY + LM.turbR },
    { x: ox, y: LM.ductY },
    { x: -150, y: LM.injTop - 20 },
    { x: -78, y: LM.injTop },
  ], 12, "ox-gas", "gas", 34),
  line("fuel-gas-to-chamber", [
    { x: fuel, y: LM.turbY + LM.turbR },
    { x: fuel, y: LM.ductY },
    { x: 150, y: LM.injTop - 20 },
    { x: 78, y: LM.injTop },
  ], 12, "fuel-gas", "gas", 34),
  line("coolant-downcomer", [
    { x: fuel, y: LM.splitY },
    { x: LM.downcomerX, y: LM.splitY },
    { x: LM.downcomerX, y: 1640 },
    { x: outerRadius(1640) + 4, y: 1640 },
  ], 8, "methane", "coolant", 32),
];

export function pathLength(pts: Pt[]): { seg: number[]; total: number } {
  const seg = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.hypot(dx, dy);
    seg.push(total);
  }
  return { seg, total };
}

export function pointAlong(pts: Pt[], distance: number): { x: number; y: number; ang: number } {
  const { seg, total } = pathLength(pts);
  const d = ((distance % total) + total) % total;
  for (let i = 1; i < pts.length; i++) {
    if (d <= seg[i] || i === pts.length - 1) {
      const span = seg[i] - seg[i - 1] || 1;
      const t = clamp01((d - seg[i - 1]) / span);
      const x = lerp(pts[i - 1].x, pts[i].x, t);
      const y = lerp(pts[i - 1].y, pts[i].y, t);
      const ang = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
      return { x, y, ang };
    }
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, ang: 0 };
}
