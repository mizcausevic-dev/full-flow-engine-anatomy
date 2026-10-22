import { cameraAt } from "../src/engine/camera";
import { boreRadius, LM } from "../src/engine/geometry";
import { BEATS, chipsFor, flowPhase, FRAME_COUNT, LAST_FRAME } from "../src/engine/timeline";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

assert(FRAME_COUNT === 1020, "frame count is 1020");
assert(BEATS[0].start === 0, "timeline starts at 0");
assert(BEATS[BEATS.length - 1].end === LAST_FRAME, "timeline ends at 1019");

let covered = 0;
for (let i = 0; i < BEATS.length; i++) {
  const beat = BEATS[i];
  covered += beat.end - beat.start + 1;
  if (i > 0) {
    assert(beat.start === BEATS[i - 1].end + 1, `gap or overlap before ${beat.id}`);
  }
}
assert(covered === FRAME_COUNT, `beats cover every frame, got ${covered}`);

const expected = [
  ["feed", 0, 149],
  ["preburner", 150, 299],
  ["turbine", 300, 509],
  ["chamber", 510, 749],
  ["nozzle", 750, 1019],
] as const;
expected.forEach(([id, start, end], index) => {
  assert(BEATS[index].id === id && BEATS[index].start === start && BEATS[index].end === end, `beat ${id} window`);
});

let maxStep = 0;
let prev = cameraAt(0);
for (let frame = 0; frame <= LAST_FRAME; frame++) {
  const cam = cameraAt(frame);
  assert(Number.isFinite(cam.x) && Number.isFinite(cam.y) && cam.spanY > 40, `camera finite at ${frame}`);
  const step = Math.hypot(cam.x - prev.x, cam.y - prev.y) / cam.spanY;
  if (step > maxStep) maxStep = step;
  prev = cam;
}
assert(maxStep < 0.03, `camera step too large: ${maxStep.toFixed(4)} of the frame`);

const hold = cameraAt(960);
const end = cameraAt(1019);
assert(hold.x === end.x && hold.y === end.y && hold.spanY === end.spanY, "camera holds from 960 through 1019");

assert(flowPhase(975) === flowPhase(1019), "flow phase is frozen for the held plate");
assert(flowPhase(1019) > flowPhase(100), "flow phase advances before the hold");

const chipsA = JSON.stringify(chipsFor(990));
const chipsB = JSON.stringify(chipsFor(1019));
assert(chipsA === chipsB, "chips are stable on the held plate");

assert(boreRadius(LM.barrelEnd) === LM.chamberR, "barrel radius");
assert(boreRadius(LM.throatY) < boreRadius(LM.barrelEnd), "throat is narrower than the barrel");
assert(Math.abs(boreRadius(LM.throatY) - LM.throatR) < 1e-6, "throat radius lands on the throat");
assert(boreRadius(LM.exitY) > boreRadius(LM.chamberR), "exit is wider than the chamber");
assert(boreRadius(LM.exitY) === LM.exitR, "exit radius");

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log(`ok frames=${FRAME_COUNT} maxCameraStep=${maxStep.toFixed(4)} phaseEnd=${flowPhase(1019).toFixed(2)}`);
