import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const heroParts = ["assets-b64/hero-part-00", "assets-b64/hero-part-01", "assets-b64/hero-part-02", "assets-b64/hero-part-03", "assets-b64/hero-part-04", "assets-b64/hero-part-05", "assets-b64/hero-part-06"];

function heroSource() {
  if (heroParts.every((part) => existsSync(part))) return heroParts;
  return ["assets-b64/hero-Cursor.jpg.b64"];
}

const pairs = [
  [heroSource(), "public/hero-Cursor.jpg"],
  ["assets-b64/space-grotesk-400.woff2.b64", "src/fonts/space-grotesk-400.woff2"],
  ["assets-b64/space-grotesk-500.woff2.b64", "src/fonts/space-grotesk-500.woff2"],
  ["assets-b64/space-grotesk-600.woff2.b64", "src/fonts/space-grotesk-600.woff2"],
  ["assets-b64/jetbrains-mono-400.woff2.b64", "src/fonts/jetbrains-mono-400.woff2"],
  ["assets-b64/jetbrains-mono-500.woff2.b64", "src/fonts/jetbrains-mono-500.woff2"],
];

for (const [source, dest] of pairs) {
  const sources = Array.isArray(source) ? source : [source];
  if (existsSync(dest)) continue;
  for (const part of sources) {
    if (!existsSync(part)) {
      console.error(`Missing ${part}. Cannot unpack ${dest}.`);
      process.exit(1);
    }
  }
  mkdirSync(dirname(dest), { recursive: true });
  const encoded = sources.map((part) => readFileSync(part, "utf8").trim()).join("");
  writeFileSync(dest, Buffer.from(encoded, "base64"));
  console.log(`unpacked ${dest}`);
}
