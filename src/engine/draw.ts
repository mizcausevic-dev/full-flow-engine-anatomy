import { cameraAt } from "./camera";
import { layoutCallouts, type PlacedCallout } from "./callouts";
import { lerp, reveal, smootherstep } from "./easing";
import {
  DUCTS,
  LM,
  boreRadius,
  outerRadius,
  pathLength,
  pointAlong,
  wallThickness,
  type Duct,
  type Fluid,
} from "./geometry";
import { PAL } from "./palette";
import { chipsFor, flowPhase, formatClock, LAST_FRAME } from "./timeline";

export interface FramePaint {
  callouts: PlacedCallout[];
}

function fluidColor(fluid: Fluid): string {
  if (fluid === "lox") return PAL.lox;
  if (fluid === "methane") return PAL.methane;
  if (fluid === "ox-gas") return PAL.oxGas;
  return PAL.fuelGas;
}

function trace(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

function sampleWall(side: 1 | -1, radius: (y: number) => number, y0: number, y1: number) {
  const pts: { x: number; y: number }[] = [];
  const steps = Math.max(8, Math.ceil(Math.abs(y1 - y0) / 8));
  for (let i = 0; i <= steps; i++) {
    const y = lerp(y0, y1, i / steps);
    pts.push({ x: side * radius(y), y });
  }
  return pts;
}

function drawBackground(ctx: CanvasRenderingContext2D, cssW: number, cssH: number) {
  ctx.fillStyle = PAL.stage;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  const gap = 44;
  ctx.beginPath();
  for (let x = gap / 2; x < cssW; x += gap) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cssH);
  }
  for (let y = gap / 2; y < cssH; y += gap) {
    ctx.moveTo(0, y);
    ctx.lineTo(cssW, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawContourMetal(ctx: CanvasRenderingContext2D) {
  const y0 = LM.injFace;
  const y1 = LM.exitY;
  const rightOuter = sampleWall(1, outerRadius, y0, y1);
  const leftOuter = sampleWall(-1, outerRadius, y1, y0);
  const rightInner = sampleWall(1, boreRadius, y0, y1);
  const leftInner = sampleWall(-1, boreRadius, y1, y0);

  ctx.beginPath();
  rightOuter.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  leftOuter.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  leftInner.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  rightInner.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = PAL.metal;
  ctx.fill("evenodd");

  ctx.save();
  ctx.clip("evenodd");
  ctx.strokeStyle = "rgba(10, 14, 22, 0.45)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let y = y0 - 40; y < y1 + 40; y += 9) {
    const reach = outerRadius(LM.throatY) + 80;
    ctx.moveTo(-reach, y);
    ctx.lineTo(reach, y + reach);
  }
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  rightInner.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = PAL.metalLight;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  sampleWall(-1, boreRadius, y0, y1).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function drawCoolantCavity(ctx: CanvasRenderingContext2D, phase: number) {
  const y0 = LM.injFace + 24;
  const y1 = LM.throatY + 80;
  const inner = (y: number) => boreRadius(y) + 8;
  const outer = (y: number) => boreRadius(y) + wallThickness(y) - 8;
  for (const side of [1, -1] as const) {
    ctx.beginPath();
    sampleWall(side, outer, y0, y1).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    sampleWall(side, inner, y1, y0).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = PAL.methane;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.clip();
    ctx.strokeStyle = PAL.cyan;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 11]);
    ctx.lineDashOffset = -phase * 0.55;
    ctx.beginPath();
    const mid = (y: number) => side * (boreRadius(y) + wallThickness(y) * 0.5);
    sampleWall(side, mid, y1, y0).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

function drawHeatTicks(ctx: CanvasRenderingContext2D, phase: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAL.gold;
  ctx.fillStyle = PAL.gold;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 7; i++) {
    const y = lerp(LM.injFace + 80, LM.throatY + 20, i / 6);
    const shift = ((phase * 0.22 + i * 18) % 26) - 8;
    const x0 = boreRadius(y) + 2;
    const x1 = boreRadius(y) + wallThickness(y) * 0.55;
    const yLine = y + shift * 0.15;
    ctx.beginPath();
    ctx.moveTo(x0, yLine);
    ctx.lineTo(x1, yLine);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, yLine);
    ctx.lineTo(x1 - 6, yLine - 3.5);
    ctx.lineTo(x1 - 6, yLine + 3.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawCombustion(ctx: CanvasRenderingContext2D, frame: number) {
  const breathe = frame >= 975 ? 1 : 0.94 + 0.06 * Math.sin(frame * 0.07);
  ctx.save();
  ctx.beginPath();
  sampleWall(1, boreRadius, LM.injFace, LM.exitY).forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
  );
  sampleWall(-1, boreRadius, LM.exitY, LM.injFace).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.clip();

  const grad = ctx.createLinearGradient(0, LM.injFace, 0, LM.exitY);
  grad.addColorStop(0, PAL.burnCore);
  grad.addColorStop(0.22, "#c56a3c");
  grad.addColorStop(0.42, PAL.burnEdge);
  grad.addColorStop(0.62, "#4d403c");
  grad.addColorStop(1, PAL.expanded);
  ctx.globalAlpha = 0.92 * breathe;
  ctx.fillStyle = grad;
  ctx.fillRect(-LM.exitR - 20, LM.injFace, (LM.exitR + 20) * 2, LM.exitY - LM.injFace);

  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "rgba(231, 237, 244, 0.35)";
  ctx.lineWidth = 1.25;
  ctx.setLineDash([5, 14]);
  ctx.lineDashOffset = -flowPhase(frame) * 0.8;
  for (const fraction of [-0.72, -0.38, 0, 0.38, 0.72]) {
    ctx.beginPath();
    const yStart = LM.throatY - 30;
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      const y = lerp(yStart, LM.exitY - 16, t);
      const x = fraction * boreRadius(y) * (0.55 + 0.45 * t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawInjector(ctx: CanvasRenderingContext2D) {
  const y0 = LM.injTop;
  const y1 = LM.injFace;
  const r = LM.chamberR;
  ctx.fillStyle = PAL.metalDark;
  ctx.fillRect(-r, y0, r * 2, y1 - y0);
  ctx.strokeStyle = "rgba(10,14,22,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = -r; x < r; x += 8) {
    ctx.moveTo(x, y0);
    ctx.lineTo(x + (y1 - y0), y1);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(-r, y0, r * 2, y1 - y0);
  ctx.clip();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = PAL.metalLight;
  ctx.strokeRect(-r, y0, r * 2, y1 - y0);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawPump(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  const r = LM.pumpR;
  ctx.fillStyle = PAL.metal;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(10,14,22,0.4)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let d = -r; d < r; d += 8) {
    ctx.moveTo(x - r, y + d);
    ctx.lineTo(x + r, y + d + r);
  }
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = PAL.metalLight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = PAL.bone;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(r * 0.2, 0);
    ctx.quadraticCurveTo(r * 0.48, r * 0.22, r * 0.7, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.fillStyle = PAL.passage;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawPreburner(ctx: CanvasRenderingContext2D, x: number, rich: "ox" | "fuel") {
  const w = 168;
  const h = LM.preBot - LM.preTop;
  const left = x - w / 2;
  roundRect(ctx, left, LM.preTop, w, h, 18);
  ctx.fillStyle = PAL.metal;
  ctx.fill();
  ctx.strokeStyle = PAL.metalLight;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = rich === "ox" ? "rgba(196,137,124,0.72)" : "rgba(210,163,108,0.72)";
  roundRect(ctx, left + 16, LM.preTop + 36, w - 32, h - 64, 10);
  ctx.fill();
  ctx.strokeStyle = PAL.violet;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const largeX = x;
  const smallX = rich === "ox" ? x + 58 : x - 58;
  const ports = [
    { px: largeX, bore: 16, color: rich === "ox" ? PAL.lox : PAL.methane },
    { px: smallX, bore: 6, color: rich === "ox" ? PAL.methane : PAL.lox },
  ];
  for (const port of ports) {
    ctx.fillStyle = PAL.metal;
    ctx.fillRect(port.px - port.bore - 4, LM.preTop - 28, (port.bore + 4) * 2, 30);
    ctx.fillStyle = port.color;
    ctx.fillRect(port.px - port.bore, LM.preTop - 24, port.bore * 2, 26);
  }

  ctx.fillStyle = PAL.metal;
  ctx.fillRect(x - 16, LM.preBot - 8, 32, 22);
  ctx.fillStyle = rich === "ox" ? PAL.oxGas : PAL.fuelGas;
  ctx.fillRect(x - 8, LM.preBot - 4, 16, 18);
}

function drawTurbine(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  const r = LM.turbR;
  roundRect(ctx, x - r, y - r * 0.72, r * 2, r * 1.44, 12);
  ctx.fillStyle = PAL.metal;
  ctx.fill();
  ctx.strokeStyle = PAL.metalLight;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = PAL.metalDark;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.bone;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
    ctx.lineTo(Math.cos(a + 0.18) * r * 0.55, Math.sin(a + 0.18) * r * 0.55);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAL.passage;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawShaft(ctx: CanvasRenderingContext2D, x: number) {
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 30, LM.pumpY);
  ctx.lineTo(x - 30, LM.turbY);
  ctx.stroke();
  ctx.fillStyle = PAL.gold;
  const y = lerp(LM.pumpY, LM.turbY, 0.5);
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 10);
  ctx.lineTo(x - 18, y);
  ctx.lineTo(x - 30, y + 10);
  ctx.closePath();
  ctx.fill();
}

function drawDuct(ctx: CanvasRenderingContext2D, duct: Duct, phase: number, px: number, opacity: number) {
  const { pts } = duct;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.metal;
  ctx.lineWidth = duct.bore * 2 + 10;
  trace(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = fluidColor(duct.fluid);
  ctx.lineWidth = Math.max(2, duct.bore * 2 - 1);
  trace(ctx, pts);
  ctx.stroke();

  const accent = duct.pathway === "coolant" || duct.pathway === "minority" ? 0.55 : 0.9;
  ctx.strokeStyle = PAL.cyan;
  ctx.globalAlpha = opacity * accent;
  ctx.lineWidth = Math.max(px * 1.25, duct.pathway === "minority" ? 1.2 : 2);
  trace(ctx, pts);
  ctx.stroke();
  ctx.globalAlpha = opacity;

  const { total } = pathLength(pts);
  const size = Math.max(5, duct.bore * 0.55);
  ctx.strokeStyle = PAL.stage;
  ctx.lineWidth = Math.max(1.2, px);
  ctx.lineCap = "round";
  for (let d = (phase * (duct.pathway === "coolant" ? 0.7 : 1.15)) % duct.spacing; d < total; d += duct.spacing) {
    const p = pointAlong(pts, d);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.55, size * 0.5);
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.55, -size * 0.5);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawFlange(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = PAL.metalLight;
  ctx.fillRect(x - 22, y - 6, 44, 12);
  ctx.fillStyle = PAL.passage;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMachines(ctx: CanvasRenderingContext2D, angle: number) {
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? LM.ox : LM.fuel;
    drawShaft(ctx, x);
    drawPump(ctx, x, LM.pumpY, angle + (side < 0 ? 0 : 0.7));
    drawPreburner(ctx, x, side < 0 ? "ox" : "fuel");
    drawTurbine(ctx, x, LM.turbY, angle + (side < 0 ? 0 : 0.7));
  }
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  camSpan: number,
  camY: number,
) {
  if (camSpan > 2400) return;
  const w = 92;
  const h = 132;
  const x = cssW - w - 14;
  const y = cssH - h - 36;
  ctx.save();
  ctx.fillStyle = "rgba(11,16,25,0.82)";
  ctx.strokeStyle = PAL.metal;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = PAL.dim;
  ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("LOCATOR", x + 8, y + 14);

  const top = LM.top;
  const bottom = LM.bottom;
  const scale = (h - 28) / (bottom - top);
  const cx = x + w / 2;
  const worldToMini = (wy: number) => y + 20 + (wy - top) * scale;
  ctx.strokeStyle = PAL.metalLight;
  ctx.beginPath();
  ctx.moveTo(cx, worldToMini(LM.injFace));
  for (let yy = LM.injFace; yy <= LM.exitY; yy += 20) {
    ctx.lineTo(cx + boreRadius(yy) * scale, worldToMini(yy));
  }
  ctx.stroke();
  ctx.fillStyle = PAL.cyan;
  ctx.fillRect(cx + LM.ox * scale * 0.15 - 2, worldToMini(LM.pumpY) - 3, 4, 6);
  ctx.fillRect(cx + LM.fuel * scale * 0.15 - 2, worldToMini(LM.pumpY) - 3, 4, 6);

  const viewTop = camY - camSpan / 2;
  const viewH = camSpan * scale;
  ctx.strokeStyle = PAL.cyan;
  ctx.strokeRect(x + 6, worldToMini(viewTop), w - 12, Math.max(6, viewH));
  ctx.restore();
}

function drawInset(ctx: CanvasRenderingContext2D, cssW: number, frame: number) {
  const alpha = Math.min(reveal(frame, 770, 955), frame >= 900 ? smootherstep((955 - frame) / 20) : 1);
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const w = 210;
  const h = 168;
  const x = cssW - w - 14;
  const y = 48;
  ctx.fillStyle = "rgba(11,16,25,0.88)";
  ctx.strokeStyle = PAL.metal;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = PAL.dim;
  ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("QUALITATIVE  \u00b7  NO NUMBERS", x + 10, y + 16);

  ctx.beginPath();
  ctx.moveTo(x + 28, y + 36);
  ctx.lineTo(x + 70, y + 36);
  ctx.quadraticCurveTo(x + 108, y + 36, x + 118, y + 78);
  ctx.quadraticCurveTo(x + 132, y + 132, x + 186, y + 142);
  ctx.strokeStyle = PAL.bone;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 28, y + 58);
  ctx.lineTo(x + 70, y + 58);
  ctx.quadraticCurveTo(x + 96, y + 58, x + 104, y + 78);
  ctx.quadraticCurveTo(x + 116, y + 112, x + 186, y + 124);
  ctx.stroke();

  ctx.fillStyle = PAL.violet;
  ctx.font = "11px 'Space Grotesk', sans-serif";
  ctx.fillText("subsonic", x + 12, y + 78);
  ctx.fillText("sonic", x + 96, y + 74);
  ctx.fillText("supersonic", x + 124, y + 112);
  ctx.fillStyle = PAL.muted;
  ctx.font = "11px 'Space Grotesk', sans-serif";
  ctx.fillText("de Laval states. No Mach,", x + 10, y + 148);
  ctx.fillText("no pressure.", x + 10, y + 162);
  ctx.restore();
}

function drawChips(ctx: CanvasRenderingContext2D, cssW: number, frame: number) {
  const chips = chipsFor(frame);
  ctx.font = "11px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  let x = 14;
  const y = 40;
  for (const chip of chips) {
    const label = chip.label.toUpperCase();
    const width = ctx.measureText(label).width + 16;
    ctx.fillStyle = "rgba(11,16,25,0.82)";
    ctx.strokeStyle = chip.label === "Slow motion" || chip.label === "Scale changed" ? PAL.gold : PAL.metal;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, 22);
    ctx.strokeRect(x, y, width, 22);
    ctx.fillStyle = PAL.bone;
    ctx.fillText(label, x + 8, y + 11);
    x += width + 6;
    if (x > cssW - 80) break;
  }
}

function drawLeaders(ctx: CanvasRenderingContext2D, callouts: PlacedCallout[]) {
  ctx.save();
  ctx.lineWidth = 1;
  for (const callout of callouts) {
    ctx.globalAlpha = callout.opacity;
    ctx.strokeStyle = callout.color;
    ctx.fillStyle = callout.color;
    ctx.beginPath();
    ctx.moveTo(callout.anchorX, callout.anchorY);
    const elbowX = callout.boxX < callout.anchorX ? callout.boxX + callout.boxW : callout.boxX;
    const elbowY = callout.boxY + 17;
    ctx.lineTo(elbowX, elbowY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(callout.anchorX, callout.anchorY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFilmEdge(ctx: CanvasRenderingContext2D, cssW: number, frame: number) {
  ctx.save();
  ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = PAL.muted;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  const label = `F ${String(frame).padStart(4, "0")}  /  ${LAST_FRAME}   ${formatClock(frame)}`;
  ctx.fillText(label, cssW - 12, 22);
  ctx.restore();
}

function drawTransverseDetail(ctx: CanvasRenderingContext2D, frame: number) {
  const alpha = reveal(frame, 645, 748);
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const x = 16;
  const y = 72;
  const w = 168;
  const h = 92;
  ctx.fillStyle = "rgba(11,16,25,0.9)";
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = PAL.dim;
  ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("TRANSVERSE DETAIL", x + 8, y + 14);
  ctx.fillStyle = PAL.muted;
  ctx.font = "11px 'Space Grotesk', sans-serif";
  ctx.fillText("Across the wall. Schematic.", x + 8, y + 30);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = PAL.metal;
    ctx.fillRect(x + 12 + i * 24, y + 44, 20, 28);
    ctx.fillStyle = PAL.methane;
    ctx.fillRect(x + 15 + i * 24, y + 48, 14, 20);
  }
  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  frame: number,
  dpr: number,
): FramePaint {
  const f = Math.max(0, Math.min(LAST_FRAME, Math.round(frame)));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground(ctx, cssW, cssH);
  if (cssW < 2 || cssH < 2) return { callouts: [] };

  const cam = cameraAt(f);
  const z = cssH / cam.spanY;
  const px = 1 / z;
  const phase = flowPhase(f);
  const angle = phase * 0.035;

  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cssW / 2 - cam.x * z), dpr * (cssH / 2 - cam.y * z));

  ctx.strokeStyle = "rgba(147,160,181,0.25)";
  ctx.lineWidth = px;
  ctx.setLineDash([4 * px, 8 * px]);
  ctx.beginPath();
  ctx.moveTo(0, LM.top);
  ctx.lineTo(0, LM.bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  drawContourMetal(ctx);
  drawCoolantCavity(ctx, phase);
  drawHeatTicks(ctx, phase, reveal(f, 560, 980));
  drawCombustion(ctx, f);
  drawInjector(ctx);

  const returnStubAlpha = 0.35 + 0.65 * reveal(f, 540, 980);
  ctx.save();
  ctx.globalAlpha = returnStubAlpha;
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(outerRadius(LM.injFace + 30), LM.injFace + 10);
  ctx.lineTo(outerRadius(LM.injFace + 30) + 36, LM.injFace - 24);
  ctx.stroke();
  ctx.restore();

  for (const duct of DUCTS) {
    const opacity = duct.pathway === "coolant" ? 0.2 + 0.8 * smootherstep((f - 500) / 80) : 1;
    drawDuct(ctx, duct, phase, px, opacity);
  }
  drawMachines(ctx, angle);
  drawFlange(ctx, LM.ox, LM.tankFlange);
  drawFlange(ctx, LM.fuel, LM.tankFlange);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const callouts = layoutCallouts(f, cssW, cssH);
  drawLeaders(ctx, callouts);
  drawChips(ctx, cssW, f);
  drawInset(ctx, cssW, f);
  drawTransverseDetail(ctx, f);
  drawMinimap(ctx, cssW, cssH, cam.spanY, cam.y);
  drawFilmEdge(ctx, cssW, f);

  const vignette = ctx.createRadialGradient(
    cssW / 2,
    cssH / 2,
    Math.min(cssW, cssH) * 0.45,
    cssW / 2,
    cssH / 2,
    Math.max(cssW, cssH) * 0.72,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, cssW, cssH);

  return { callouts };
}
