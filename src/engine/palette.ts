/** Stage and overlay colors from the brief. Accents annotate. They are not emission. */
export const PAL = {
  stage: "#0B1019",
  stageLift: "#121a27",
  metal: "#344257",
  metalLight: "#51627a",
  metalDark: "#232d3d",
  cut: "#1a2331",
  passage: "#070b12",
  bone: "#E7EDF4",
  muted: "#93A0B5",
  dim: "#66758a",
  lox: "#8aa8b4",
  methane: "#c2ae93",
  oxGas: "#c4897c",
  fuelGas: "#d2a36c",
  burnCore: "#e39a58",
  burnEdge: "#8a4634",
  expanded: "#3e4a5c",
  cyan: "#00E5FF",
  gold: "#FFD166",
  violet: "#9D4EDD",
} as const;

export type Tone = "cyan" | "gold" | "violet" | "steel";

export function toneColor(tone: Tone): string {
  if (tone === "cyan") return PAL.cyan;
  if (tone === "gold") return PAL.gold;
  if (tone === "violet") return PAL.violet;
  return PAL.bone;
}
