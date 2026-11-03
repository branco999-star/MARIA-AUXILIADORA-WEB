// Usage: FFMPEG=<path to ffmpeg.exe> node tools/build-gallery.mjs
// Needs the local server running (npm run serve) to render PDF pages with pdf.js in Chromium.
// Reads the original material folders (never modified) and writes web-ready copies to assets/galeria/:
//   photos -> WebP (no metadata), videos -> 480px H.264 without audio + WebP poster,
//   PDF catalogs -> one WebP per page. Also writes assets/galeria/galeria.json for the site.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const SERVER = "http://localhost:3000";
const OUT = "assets/galeria";

const CATEGORIES = [
  { id: "almanaques", title: "Almanaques", folder: "Almanaques" },
  { id: "bolsas-kraft", title: "Bolsas kraft", folder: "Bolsas kraft" },
  { id: "cajas-con-tu-logo", title: "Cajas con tu logo", folder: "Cajas con tu logo" },
  { id: "cirios-velas-y-velones", title: "Cirios, velas y velones", folder: "Cirios, velas y velones" },
  { id: "llaveros-y-souvenirs", title: "Llaveros y souvenirs", folder: "Llaveros y souvenirs" },
  { id: "recuerdos-para-eventos", title: "Recuerdos para eventos", folder: "Recuerdos para eventos" },
  { id: "cuadros-de-promocion", title: "Cuadros de promoción", folder: "cuadros de promocion" },
  { id: "diseno-grafico", title: "Diseño gráfico", folder: "diseño grafico" },
];

// Human names for the PDF catalogs, keyed by a fragment of the file name
const CATALOG_NAMES = [
  [/CUMPLEA/i, "Catálogo de cumpleaños", "cumpleanos"],
  [/MATRIMONIO/i, "Catálogo de matrimonio", "matrimonio"],
  [/MISA DE HONRAS/i, "Catálogo de misa de honras", "misa-de-honras"],
  [/CUADRO PROMOCION/i, "Catálogo de cuadros de promoción (nivel inicial)", "cuadros-inicial"],
];

const ff = args => execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const probeSize = file => {
  const out = execFileSync(FFMPEG.replace(/ffmpeg(\.exe)?$/i, m => m.replace("ffmpeg", "ffprobe")),
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]).toString().trim();
  const [w, h] = out.split(",").map(Number);
  return { w, h };
};
const pad = n => String(n).padStart(2, "0");
const kb = f => Math.round(statSync(f).size / 1024);

rmSync(OUT, { recursive: true, force: true });
const manifest = [];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${SERVER}/index.html`);

for (const cat of CATEGORIES) {
  const dir = path.join(OUT, cat.id);
  mkdirSync(dir, { recursive: true });
  const files = readdirSync(cat.folder).sort();
  const items = [];
  let nPhoto = 0, nVideo = 0;

  for (const f of files.filter(f => /\.jpe?g$/i.test(f))) {
    const base = `${dir}/foto-${pad(++nPhoto)}`;
    const src = path.join(cat.folder, f);
    ff(["-i", src, "-map_metadata", "-1", "-vf", "scale='min(1200,iw)':-2", "-c:v", "libwebp", "-quality", "80", `${base}.webp`]);
    ff(["-i", src, "-map_metadata", "-1", "-vf", "scale='min(360,iw)':-2", "-c:v", "libwebp", "-quality", "70", `${base}-mini.webp`]);
    const { w, h } = probeSize(`${base}.webp`);
    items.push({ type: "image", src: `${base}.webp`, thumb: `${base}-mini.webp`, w, h, alt: `${cat.title} — foto ${nPhoto}` });
  }

  for (const f of files.filter(f => /\.mp4$/i.test(f))) {
    const base = `${dir}/video-${pad(++nVideo)}`;
    const src = path.join(cat.folder, f);
    ff(["-i", src, "-map_metadata", "-1", "-vf", "scale='min(480,iw)':-2,fps=24", "-c:v", "libx264", "-preset", "slow", "-crf", "31",
      "-profile:v", "main", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", `${base}.mp4`]);
    ff(["-ss", "1", "-i", `${base}.mp4`, "-frames:v", "1", "-c:v", "libwebp", "-quality", "75", `${base}.webp`]);
    ff(["-i", `${base}.webp`, "-vf", "scale=360:-2", "-c:v", "libwebp", "-quality", "70", `${base}-mini.webp`]);
    const { w, h } = probeSize(`${base}.mp4`);
    items.push({ type: "video", src: `${base}.mp4`, poster: `${base}.webp`, thumb: `${base}-mini.webp`, w, h, alt: `${cat.title} — vídeo ${nVideo}` });
  }

  for (const f of files.filter(f => /\.pdf$/i.test(f))) {
    const [, group, slug] = CATALOG_NAMES.find(([re]) => re.test(f)) || [null, f.replace(/\.pdf$/i, ""), "catalogo"];
    const url = `${SERVER}/${encodeURI(`${cat.folder}/${f}`)}`;
    const count = await page.evaluate(async url => {
      const pdfjs = await import("/node_modules/pdfjs-dist/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.mjs";
      window.__doc = await pdfjs.getDocument({ url }).promise;
      return window.__doc.numPages;
    }, url);
    for (let i = 1; i <= count; i++) {
      const pages = await page.evaluate(async i => {
        const p = await window.__doc.getPage(i);
        const render = async width => {
          const base = p.getViewport({ scale: 1 });
          const viewport = p.getViewport({ scale: width / base.width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
          await p.render({ canvas, canvasContext: ctx, viewport }).promise;
          return { data: canvas.toDataURL("image/webp", width > 500 ? 0.8 : 0.7), w: canvas.width, h: canvas.height };
        };
        return { full: await render(1100), mini: await render(360) };
      }, i);
      const base = `${dir}/${slug}-${pad(i)}`;
      writeFileSync(`${base}.webp`, Buffer.from(pages.full.data.split(",")[1], "base64"));
      writeFileSync(`${base}-mini.webp`, Buffer.from(pages.mini.data.split(",")[1], "base64"));
      items.push({ type: "page", group, src: `${base}.webp`, thumb: `${base}-mini.webp`, w: pages.full.w, h: pages.full.h, alt: `${group} — página ${i}` });
    }
    console.log(`  ${cat.title}: ${group} (${count} páginas)`);
  }

  const total = items.reduce((s, it) => s + kb(it.src) + kb(it.thumb) + (it.poster && it.poster !== it.src ? kb(it.poster) : 0), 0);
  console.log(`${cat.title}: ${items.length} elementos, ${(total / 1024).toFixed(1)} MB`);
  manifest.push({ id: cat.id, title: cat.title, items });
}

await browser.close();
writeFileSync(`${OUT}/galeria.json`, JSON.stringify(manifest));
console.log(`${OUT}/galeria.json`);
