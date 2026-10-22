import { layoutCallouts } from "./engine/callouts";
import { renderFrame } from "./engine/draw";
import { BEATS, beatAt, chipsFor, formatClock, LAST_FRAME } from "./engine/timeline";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#stage");
const calloutLayer = document.querySelector<HTMLElement>("#callouts");
const scrub = document.querySelector<HTMLInputElement>("#scrub");
const playButton = document.querySelector<HTMLButtonElement>("#play");
const replayButton = document.querySelector<HTMLButtonElement>("#replay");
const clockEl = document.querySelector<HTMLElement>("#clock");
const frameEl = document.querySelector<HTMLElement>("#frame-readout");
const beatTitle = document.querySelector<HTMLElement>("#beat-title");
const beatCopy = document.querySelector<HTMLElement>("#beat-copy");
const chipRow = document.querySelector<HTMLElement>("#chip-row");
const live = document.querySelector<HTMLElement>("#live");
const beatButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-frame]")];

if (!canvas || !calloutLayer || !scrub || !playButton || !replayButton || !clockEl || !frameEl || !beatTitle || !beatCopy || !chipRow || !live) {
  throw new Error("Player markup is missing an expected element.");
}

const stage = canvas;
const layer = calloutLayer;
const range = scrub;
const play = playButton;
const replay = replayButton;
const clock = clockEl;
const frameReadout = frameEl;
const beatHeading = beatTitle;
const beatBody = beatCopy;
const chips = chipRow;
const liveRegion = live;
const context = stage.getContext("2d");
if (!context) throw new Error("Canvas 2D is unavailable.");
const pen = context;

const params = new URLSearchParams(location.search);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const forcePause = params.get("play") === "0" || reduced;
const queryFrame = Number(params.get("frame"));

let frame = Number.isFinite(queryFrame) ? Math.max(0, Math.min(LAST_FRAME, Math.round(queryFrame))) : reduced ? LAST_FRAME : 0;
let playing = !forcePause && frame < LAST_FRAME;
let lastTick = performance.now();
let accumulator = 0;
let announcedBeat = "";

const calloutNodes = new Map<string, HTMLElement>();

function syncSlider() {
  range.value = String(frame);
  range.style.setProperty("--attr-min", range.min || "0");
  range.style.setProperty("--attr-max", range.max || "1019");
  range.style.setProperty("--control-value", String(frame));
  range.setAttribute(
    "aria-valuetext",
    `${formatClock(frame)}, frame ${frame}, ${beatAt(frame).title}`,
  );
}

function render() {
  const cssW = stage.clientWidth;
  const cssH = stage.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.max(1, Math.round(cssW * dpr));
  const bh = Math.max(1, Math.round(cssH * dpr));
  if (stage.width !== bw || stage.height !== bh) {
    stage.width = bw;
    stage.height = bh;
  }
  const painted = renderFrame(pen, cssW, cssH, frame, dpr);
  paintCallouts(painted.callouts);
  const beat = beatAt(frame);
  clock.textContent = formatClock(frame);
  frameReadout.textContent = `${String(frame).padStart(4, "0")} / ${LAST_FRAME}`;
  beatHeading.textContent = `${beat.index}  ${beat.title}`;
  beatBody.textContent = beat.text;
  chips.replaceChildren(
    ...chipsFor(frame).map((chip) => {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = chip.label;
      const detail = document.createElement("span");
      detail.textContent = chip.detail;
      item.append(name, detail);
      return item;
    }),
  );
  for (const button of beatButtons) {
    const start = Number(button.dataset.frame);
    const match = BEATS.find((item) => item.start === start);
    const on = match ? frame >= match.start && frame <= match.end : false;
    button.setAttribute("aria-current", on ? "true" : "false");
  }
  play.textContent = playing ? "Pause" : frame >= LAST_FRAME ? "Replay" : "Play";
  play.setAttribute("aria-pressed", playing ? "true" : "false");
  syncSlider();
  if (beat.id !== announcedBeat) {
    announcedBeat = beat.id;
    liveRegion.textContent = `${beat.index} ${beat.title}. ${beat.clock}.`;
  }
}

function paintCallouts(items: ReturnType<typeof layoutCallouts>) {
  const seen = new Set<string>();
  for (const item of items) {
    seen.add(item.id);
    let node = calloutNodes.get(item.id);
    if (!node) {
      node = document.createElement("p");
      node.className = "callout";
      const title = document.createElement("span");
      node.append(title);
      calloutNodes.set(item.id, node);
      layer.append(node);
    }
    node.dataset.tone = item.tone;
    node.style.width = `${item.boxW}px`;
    node.style.opacity = item.opacity.toFixed(3);
    node.style.transform = `translate(${item.boxX}px, ${item.boxY}px)`;
    const title = node.querySelector("span");
    if (title && title.textContent !== item.title) title.textContent = item.title;
  }
  for (const [id, node] of calloutNodes) {
    if (!seen.has(id)) node.remove(), calloutNodes.delete(id);
  }
}

function seek(next: number, autoplay = playing) {
  frame = Math.max(0, Math.min(LAST_FRAME, Math.round(next)));
  playing = autoplay && frame < LAST_FRAME;
  accumulator = 0;
  lastTick = performance.now();
  render();
}

function toggle() {
  if (frame >= LAST_FRAME) {
    seek(0, true);
    return;
  }
  playing = !playing;
  accumulator = 0;
  lastTick = performance.now();
  render();
}

function tick(now: number) {
  if (playing) {
    accumulator += now - lastTick;
    const step = 1000 / 30;
    while (accumulator >= step) {
      accumulator -= step;
      frame += 1;
      if (frame >= LAST_FRAME) {
        frame = LAST_FRAME;
        playing = false;
        accumulator = 0;
        break;
      }
    }
    render();
  }
  lastTick = now;
  requestAnimationFrame(tick);
}

play.addEventListener("click", toggle);
replay.addEventListener("click", () => seek(0, true));
range.addEventListener("input", () => seek(Number(range.value), false));
for (const button of beatButtons) {
  button.addEventListener("click", () => seek(Number(button.dataset.frame), true));
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement) return;
  if (event.key === " " && !(target instanceof HTMLButtonElement)) {
    event.preventDefault();
    toggle();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    seek(frame + (event.shiftKey ? 30 : 1), false);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    seek(frame - (event.shiftKey ? 30 : 1), false);
  } else if (event.key === "Home") {
    event.preventDefault();
    seek(0, false);
  } else if (event.key === "End") {
    event.preventDefault();
    seek(LAST_FRAME, false);
  } else if (event.key >= "1" && event.key <= "5") {
    const beat = BEATS[Number(event.key) - 1];
    if (beat) seek(beat.start, true);
  }
});

const stageObserver = new ResizeObserver(() => render());
stageObserver.observe(stage);
range.min = "0";
range.max = String(LAST_FRAME);
range.step = "1";
syncSlider();
render();
requestAnimationFrame(tick);
