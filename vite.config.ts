import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/** Drop a font-face block when its woff2 was not unpacked. The stack falls back. */
function optionalFontFaces(): Plugin {
  return {
    name: "optional-font-faces",
    transform(code, id) {
      if (!id.split("?")[0].endsWith(".css")) return null;
      const cssPath = id.split("?")[0];
      const next = code.replace(/@font-face\s*\{[^}]*\}/g, (block) => {
        const match = block.match(/url\((['"]?)([^'")]+)\1\)/);
        if (!match) return block;
        const file = resolve(dirname(cssPath), match[2]);
        return existsSync(file) ? block : "";
      });
      return next === code ? null : next;
    },
  };
}

export default defineConfig({
  plugins: [optionalFontFaces()],
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 8734,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 8734,
    strictPort: true,
  },
});
