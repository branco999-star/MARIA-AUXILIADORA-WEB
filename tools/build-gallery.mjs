// Usage: FFMPEG=<path to ffmpeg.exe> node tools/build-gallery.mjs [category id ...]
// With category ids, only those galleries are rebuilt and merged into the existing galeria.json.
// Needs the local server running (npm run serve) to render PDF pages with pdf.js in Chromium.
// Reads the original material folders (never modified) and writes web-ready copies to assets/galeria/:
//   photos -> WebP (no metadata), videos -> 480px H.264 + AAC audio + WebP poster,
//   PDF catalogs -> one WebP per page. Also writes assets/galeria/galeria.json for the site.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
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
  { id: "invitaciones", title: "Invitaciones", folder: "Recuerdos para eventos" },
  { id: "cuadros-de-promocion", title: "Cuadros de promoción", folder: "cuadros de promocion" },
  { id: "diseno-grafico", title: "Diseño gráfico", folder: "diseño grafico" },
  { id: "impresiones-y-copias", title: "Impresiones y copias", folder: "Impresiones y copias",
    alts: ["Impresiones a todo color de documentos y volantes"] },
  { id: "diagramacion", title: "Diagramación", folder: "Diagramacion",
    alts: ["Volante diagramado para una cevichería con fotos de los platos"] },
  // Only these files, in this order: the shop's own photos first, then two generic product shots
  { id: "sellos", title: "Sellos", folder: "sellos", pick: [
    ["2026-11-03 at 11.58.45 PM.jpeg", "Sellos automáticos de colores en el mostrador de la imprenta"],
    ["2026-11-03 at 11.58.46 PM (1).jpeg", "Sellos automáticos Trodat en negro, rojo y azul en la tienda"],
    ["2026-11-03 at 11.58.46 PM.jpeg", "Sellos de bolsillo Trodat de varios colores en la tienda"],
    ["2026-11-03 at 11.58.46 PM 1.jpeg", "Vitrina de la imprenta con sellos automáticos y de bolsillo"],
    ["2026-11-03 at 11.58.46 PM (2).jpeg", "Sello de madera con mango"],
    ["2026-11-04 at 10.25.43 PM 6.jpeg", "Sellos automáticos redondos Trodat"],
    ["2026-11-04 at 10.25.43 PM.jpeg", "Sello de madera con mango rojo y su impresión"],
  ] },
  { id: "serigrafia", title: "Serigrafía", folder: "Serigrafia",
    alts: ["Bolsas kraft con la carta de un restaurante impresa en serigrafía", "Caja kraft con logo impreso en serigrafía", "Bolsa kraft con logo impreso en serigrafía"] },
  { id: "enmicados", title: "Enmicados", folder: "Enmicados",
    alts: ["Enmicadora plastificando una lámina"] },
  { id: "empastados", title: "Empastados", folder: "Empastados",
    alts: ["Empastado de tapa dura azul con letras doradas"],
    // The cover shows the authors' and teacher's full names: blur only that block of text
    blur: { "10.26.20": { x: 375, y: 790, w: 390, h: 335 } } },
  { id: "corte-y-anillado", title: "Corte y anillado", folder: "Corte y anillado",
    alts: ["Guillotina cortando un taco de hojas", "Documentos anillados con espiral y tapas de colores"] },
];
const ONLY = process.argv.slice(2);
const todo = ONLY.length ? CATEGORIES.filter(c => ONLY.includes(c.id)) : CATEGORIES;
if (ONLY.length && todo.length !== ONLY.length) throw new Error("Unknown category id in: " + ONLY.join(", "));

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

if (!ONLY.length) rmSync(OUT, { recursive: true, force: true });
const manifest = [];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${SERVER}/index.html`);

for (const cat of todo) {
  const dir = `${OUT}/${cat.id}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const files = cat.pick ? cat.pick.map(([name]) => readdirSync(cat.folder).find(f => f.endsWith(name))) : readdirSync(cat.folder).sort();
  if (files.some(f => !f)) throw new Error(`${cat.title}: a picked file is missing`);
  const items = [];
  let nPhoto = 0, nVideo = 0;

  for (const f of files.filter(f => /\.jpe?g$/i.test(f))) {
    const base = `${dir}/foto-${pad(++nPhoto)}`;
    const src = path.join(cat.folder, f);
    const b = cat.blur && Object.entries(cat.blur).find(([k]) => f.includes(k));
    const pre = b ? `split[a][b];[b]crop=${b[1].w}:${b[1].h}:${b[1].x}:${b[1].y},boxblur=20:4[bl];[a][bl]overlay=${b[1].x}:${b[1].y},` : "";
    ff(["-i", src, "-map_metadata", "-1", "-vf", `${pre}scale='min(1200,iw)':-2`, "-c:v", "libwebp", "-quality", "80", `${base}.webp`]);
    ff(["-i", src, "-map_metadata", "-1", "-vf", `${pre}scale='min(360,iw)':-2`, "-c:v", "libwebp", "-quality", "70", `${base}-mini.webp`]);
    const { w, h } = probeSize(`${base}.webp`);
    const alt = (cat.pick && cat.pick[nPhoto - 1][1]) || (cat.alts && cat.alts[nPhoto - 1]) || `${cat.title} — foto ${nPhoto}`;
    items.push({ type: "image", src: `${base}.webp`, thumb: `${base}-mini.webp`, w, h, alt });
  }

  for (const f of files.filter(f => /\.mp4$/i.test(f))) {
    const base = `${dir}/video-${pad(++nVideo)}`;
    const src = path.join(cat.folder, f);
    ff(["-i", src, "-map_metadata", "-1", "-vf", "scale='min(480,iw)':-2,fps=24", "-c:v", "libx264", "-preset", "slow", "-crf", "31",
      "-profile:v", "main", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", `${base}.mp4`]);
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
// Partial runs keep the other galleries as they are, in CATEGORIES order
let out = manifest;
if (ONLY.length) {
  const old = JSON.parse(readFileSync(`${OUT}/galeria.json`, "utf8"));
  out = CATEGORIES.map(c => manifest.find(m => m.id === c.id) || old.find(m => m.id === c.id)).filter(Boolean);
}
writeFileSync(`${OUT}/galeria.json`, JSON.stringify(out));
console.log(`${OUT}/galeria.json`);
