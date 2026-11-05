// Usage: FFMPEG=<path to ffmpeg.exe> node tools/build-catalog.mjs <pages folder> <cover image>
// Builds the 2027 calendar catalog viewer pages in assets/catalogo/.
// <pages folder> holds the supplier's pages as p01.webp … p68.webp (FlipHTML5 "large" images).
// Page 1 is replaced by our own cover and the supplier's last two pages (67-68) are dropped.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const [srcDir, cover] = process.argv.slice(2);
if (!srcDir || !cover) {
  console.error("Usage: node tools/build-catalog.mjs <pages folder> <cover image>");
  process.exit(1);
}
const PAGES = 66;
const OUT = "assets/catalogo";
const ff = args => execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args]);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let total = 0;
for (let i = 1; i <= PAGES; i++) {
  const n = String(i).padStart(2, "0");
  const src = i === 1 ? cover : path.join(srcDir, `p${n}.webp`);
  const base = `${OUT}/pagina-${n}`;
  // Readable size for the viewer (and zoom), plus a small thumbnail for the index
  ff(["-i", src, "-map_metadata", "-1", "-vf", "scale='min(1400,iw)':-2", "-c:v", "libwebp", "-quality", "76", `${base}.webp`]);
  ff(["-i", src, "-map_metadata", "-1", "-vf", "scale=220:-2", "-c:v", "libwebp", "-quality", "65", `${base}-mini.webp`]);
  total += statSync(`${base}.webp`).size + statSync(`${base}-mini.webp`).size;
}
console.log(`${PAGES} pages written to ${OUT}/ (${(total / 1048576).toFixed(1)} MB)`);
