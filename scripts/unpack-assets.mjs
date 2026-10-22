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
  const missing = sources.filter((part) => !existsSync(part));
  if (missing.length) {
    console.warn(`Skipping ${dest}. Missing ${missing.join(", ")}.`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  const encoded = sources.map((part) => readFileSync(part, "utf8").trim()).join("");
  writeFileSync(dest, Buffer.from(encoded, "base64"));
  console.log(`unpacked ${dest}`);
}

const indexB64 = ["parts/index-b.b64.0", "parts/index-b.b64.1", "parts/index-b.b64.2", "parts/index-b.b64.3"];
if (!existsSync("parts/index-b.html") && indexB64.every((part) => existsSync(part))) {
  mkdirSync("parts", { recursive: true });
  const encoded = indexB64.map((part) => readFileSync(part, "utf8").trim()).join("");
  writeFileSync("parts/index-b.html", Buffer.from(encoded, "base64"));
  console.log("decoded parts/index-b.html");
}

const articleB64 = ["parts/article.b64.0", "parts/article.b64.1"];
const articleDest = "article/full-flow-staged-combustion-drawn-as-a-machine-Cursor.md";
if (!existsSync(articleDest) && articleB64.every((part) => existsSync(part))) {
  mkdirSync("article", { recursive: true });
  const encoded = articleB64.map((part) => readFileSync(part, "utf8").trim()).join("");
  writeFileSync(articleDest, Buffer.from(encoded, "base64"));
  console.log("decoded article");
}

const indexParts = ["parts/index-a.html", "parts/index-b.html"];
if (!existsSync("index.html") && indexParts.every((part) => existsSync(part))) {
  writeFileSync("index.html", indexParts.map((part) => readFileSync(part, "utf8")).join(""));
  console.log("joined index.html");
}
