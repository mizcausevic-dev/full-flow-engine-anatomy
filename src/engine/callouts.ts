import { cameraAt, project, type Camera } from "./camera";
import { reveal } from "./easing";
import { LM } from "./geometry";
import { toneColor, type Tone } from "./palette";
import { LAST_FRAME } from "./timeline";

export interface Callout {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  title: string;
  tone: Tone;
  enter: number;
  exit: number;
}

export interface PlacedCallout extends Callout {
  opacity: number;
  anchorX: number;
  anchorY: number;
  boxX: number;
  boxY: number;
  boxW: number;
  color: string;
}

const preMidY = (LM.preTop + LM.preBot) / 2;

export const CALLOUTS: Callout[] = [
  { id: "lox", x: LM.ox, y: 250, dx: -168, dy: -36, title: "LOX feed", tone: "cyan", enter: 8, exit: 168 },
  { id: "meth", x: LM.fuel, y: 250, dx: 16, dy: -36, title: "Methane feed", tone: "cyan", enter: 8, exit: 168 },
  { id: "ox-pump", x: LM.ox, y: LM.pumpY, dx: -176, dy: 8, title: "Oxidizer turbopump", tone: "steel", enter: 28, exit: 175 },
  { id: "fuel-pump", x: LM.fuel, y: LM.pumpY, dx: 18, dy: 8, title: "Fuel turbopump", tone: "steel", enter: 28, exit: 175 },
  { id: "shaft", x: LM.ox - 30, y: LM.pumpY + 130, dx: -176, dy: 6, title: "Shaft work", tone: "gold", enter: 70, exit: 160 },
  { id: "orpb", x: LM.ox, y: preMidY, dx: -176, dy: -8, title: "Oxidizer-rich preburner", tone: "cyan", enter: 165, exit: 330 },
  { id: "frpb", x: LM.fuel, y: preMidY, dx: 16, dy: -8, title: "Fuel-rich preburner", tone: "cyan", enter: 200, exit: 340 },
  { id: "ratio", x: 0, y: (LM.oxMinorY + LM.fuelMinorY) / 2, dx: -90, dy: -52, title: "Thick majority, thin minority", tone: "cyan", enter: 175, exit: 305 },
  { id: "state-gas", x: LM.ox + 20, y: preMidY + 40, dx: 24, dy: 36, title: "Liquid becomes gas", tone: "violet", enter: 210, exit: 310 },
  { id: "ox-turb", x: LM.ox, y: LM.turbY, dx: -160, dy: -10, title: "Oxidizer turbine", tone: "gold", enter: 320, exit: 470 },
  { id: "fuel-turb", x: LM.fuel, y: LM.turbY, dx: 16, dy: -10, title: "Fuel turbine", tone: "gold", enter: 340, exit: 490 },
  { id: "injector", x: 0, y: LM.injFace, dx: -100, dy: -48, title: "Both gases enter here", tone: "cyan", enter: 430, exit: 560 },
  { id: "burn", x: 0, y: 1680, dx: -150, dy: -20, title: "Continuous combustion", tone: "violet", enter: 530, exit: 650 },
  { id: "jacket", x: 100, y: 1920, dx: 28, dy: -36, title: "Fuel jacket", tone: "gold", enter: 600, exit: 755 },
  { id: "tap", x: LM.downcomerX, y: 1200, dx: 16, dy: -28, title: "Schematic cooling tap", tone: "steel", enter: 560, exit: 680 },
  { id: "throat", x: 0, y: LM.throatY, dx: -150, dy: -28, title: "Throat, sonic state", tone: "violet", enter: 760, exit: 900 },
  { id: "bell", x: 160, y: 2360, dx: 16, dy: -8, title: "Bell, expansion", tone: "cyan", enter: 800, exit: 950 },
  { id: "end-pumps", x: LM.ox - 20, y: LM.pumpY - 20, dx: -188, dy: -28, title: "Two shafts, not one", tone: "gold", enter: 930, exit: LAST_FRAME + 12 },
  { id: "end-pre", x: LM.fuel + 90, y: preMidY - 30, dx: 12, dy: -8, title: "Two preburners", tone: "cyan", enter: 940, exit: LAST_FRAME + 12 },
  { id: "end-chamber", x: -LM.chamberR - 10, y: 1720, dx: -188, dy: -8, title: "Turbine gas burns here", tone: "violet", enter: 948, exit: LAST_FRAME + 12 },
  { id: "end-nozzle", x: 150, y: 2420, dx: 16, dy: 8, title: "de Laval expansion", tone: "cyan", enter: 952, exit: LAST_FRAME + 12 },
];

const BOX_H = 34;

export function layoutCallouts(frame: number, cssW: number, cssH: number): PlacedCallout[] {
  const boxW = cssW < 520 ? 124 : 168;
  const cam = cameraAt(frame);
  const placed: PlacedCallout[] = [];
  for (const callout of CALLOUTS) {
    const opacity = reveal(frame, callout.enter, callout.exit);
    if (opacity <= 0.02) continue;
    const anchor = project(cam, cssW, cssH, callout.x, callout.y);
    if (anchor.x < -80 || anchor.x > cssW + 80 || anchor.y < -80 || anchor.y > cssH + 80) {
      continue;
    }
    let boxX = anchor.x + callout.dx;
    let boxY = anchor.y + callout.dy;
    boxX = Math.min(cssW - boxW - 10, Math.max(10, boxX));
    boxY = Math.min(cssH - BOX_H - 10, Math.max(10, boxY));
    for (const prev of placed) {
      const overlaps = Math.abs(prev.boxX - boxX) < boxW && Math.abs(prev.boxY - boxY) < BOX_H + 6;
      if (overlaps) boxY = Math.min(cssH - BOX_H - 10, prev.boxY + BOX_H + 8);
    }
    placed.push({
      ...callout,
      opacity,
      anchorX: anchor.x,
      anchorY: anchor.y,
      boxX,
      boxY,
      boxW,
      color: toneColor(callout.tone),
    });
  }
  return placed;
}

export function cameraForFrame(frame: number): Camera {
  return cameraAt(frame);
}
