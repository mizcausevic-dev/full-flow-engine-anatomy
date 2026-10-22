import { clamp, smootherstep } from "./easing";

export const FPS = 30;
export const FRAME_COUNT = 1020;
export const LAST_FRAME = 1019;

export interface Beat {
  id: "feed" | "preburner" | "turbine" | "chamber" | "nozzle";
  index: string;
  start: number;
  end: number;
  clock: string;
  title: string;
  text: string;
}

export const BEATS: Beat[] = [
  {
    id: "feed",
    index: "01",
    start: 0,
    end: 149,
    clock: "0:00\u20130:05",
    title: "Feeds and pumps",
    text: "Liquid oxygen and liquid methane arrive on separate lines from the vehicle tanks. Each enters its own turbopump. The gold shafts already run down toward the turbines that drive them, so the cause of the pumping stays in frame. Impeller rotation marks shaft work. It is not a measured speed.",
  },
  {
    id: "preburner",
    index: "02",
    start: 150,
    end: 299,
    clock: "0:05\u20130:10",
    title: "Two preburners, two ratios",
    text: "Each pump discharge splits. The thick line is the majority of that propellant. The thin line is the minority sent across, because each preburner still needs a little of the other fluid in order to burn. Oxidizer-rich takes most of the oxygen and a little methane. Fuel-rich takes most of the methane and a little oxygen. Line weight is the only ratio on the plate. Inside each can, liquid becomes gas. That gas is there to drive a turbine, not to finish combustion.",
  },
  {
    id: "turbine",
    index: "03",
    start: 300,
    end: 509,
    clock: "0:10\u20130:17",
    title: "Turbine gas to the chamber",
    text: "The gas leaves through its own turbine. Gold is the work sent back up the shaft to the pump. Cyan follows the gas inward and down. Both streams enter the main injector. In full-flow the turbine exhaust is still propellant. It is not dumped overboard. The pumps you just watched are the machines this gas is driving.",
  },
  {
    id: "chamber",
    index: "04",
    start: 510,
    end: 749,
    clock: "0:17\u20130:25",
    title: "Chamber burn and cooling",
    text: "The two streams meet and burn continuously. The fill is a flame process, deflagration, not a detonation. Methane in the wall jacket picks up heat that would otherwise stay in the metal. The camera enlarges the wall. A transverse detail shows the jacket as channels. Scale is changed, and the heat marks move slower than the flow marks so the exchange can be read. Where the jacket tees off the fuel line is a schematic, not a surveyed port.",
  },
  {
    id: "nozzle",
    index: "05",
    start: 750,
    end: 1019,
    clock: "0:25\u20130:34",
    title: "Nozzle expansion",
    text: "The bore narrows to a throat and opens into a bell. That shape is a de Laval nozzle. The design condition is subsonic in the chamber, sonic at the throat, and supersonic in the bell. The inset uses those words and no Mach number. The arrows grow as the gas expands. They are not a velocity survey. The chamber stays at the top of the frame while the bell is introduced, then the camera pulls back and holds the whole section.",
  },
];

export function beatAt(frame: number): Beat {
  const f = clamp(frame, 0, LAST_FRAME);
  for (const beat of BEATS) {
    if (f >= beat.start && f <= beat.end) return beat;
  }
  return BEATS[BEATS.length - 1];
}

export function formatClock(frame: number): string {
  const total = frame / FPS;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}

/**
 * Integrated motion parameter. Chevrons and shafts ease to a stop
 * so frames 975\u20131019 are a still plate.
 */
const PHASE = new Float64Array(FRAME_COUNT);

function motionGain(frame: number): number {
  if (frame < 960) return 1;
  if (frame >= 975) return 0;
  return 1 - smootherstep((frame - 960) / 15);
}

PHASE[0] = 0;
for (let frame = 1; frame < FRAME_COUNT; frame++) {
  PHASE[frame] = PHASE[frame - 1] + motionGain(frame - 1);
}

export function flowPhase(frame: number): number {
  return PHASE[clamp(Math.round(frame), 0, LAST_FRAME)];
}

export function chipsFor(frame: number): { label: string; detail: string }[] {
  const chips: { label: string; detail: string }[] = [
    { label: "Section", detail: "Longitudinal cut. Clocking is schematic." },
  ];
  if (frame < 975) {
    chips.push({
      label: "Time compressed",
      detail: "Chevron speed is not transit time.",
    });
  }
  if (frame >= 600 && frame < 760) {
    chips.push({
      label: "Scale changed",
      detail: "Wall section enlarged. Not a new part.",
    });
  }
  if (frame >= 640 && frame < 750) {
    chips.push({
      label: "Slow motion",
      detail: "Heat marks move slower than the flow marks.",
    });
  }
  if (frame >= 960) {
    chips.push({
      label: "Held view",
      detail: "Camera still. Flow settles to a fixed plate.",
    });
  }
  return chips;
}
