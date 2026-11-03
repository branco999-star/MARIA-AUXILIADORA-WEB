// Usage: node tools/make-logos.mjs   (needs `npm run serve` running)
// Renders the brand PDF ("Logo Imprenta María Auxiliadora.pdf", kept out of git) with pdf.js and writes:
//   assets/img/logo.webp             page 1, round seal, transparent outside the circle (header + footer)
//   assets/img/favicon.png           page 3, crowned "M" monogram without wordmark, on white (browser tab)
//   assets/img/apple-touch-icon.png  same monogram on white (iPhone home screen)
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const SERVER = "http://localhost:3000";
const PDF = "Logo Imprenta María Auxiliadora.pdf";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${SERVER}/index.html`);

const out = await page.evaluate(async url => {
  const pdfjs = await import("/node_modules/pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.mjs";
  const doc = await pdfjs.getDocument({ url }).promise;

  async function render(n, width) {
    const p = await doc.getPage(n);
    const viewport = p.getViewport({ scale: width / p.getViewport({ scale: 1 }).width });
    const c = document.createElement("canvas");
    c.width = Math.round(viewport.width); c.height = Math.round(viewport.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await p.render({ canvas: c, canvasContext: ctx, viewport }).promise;
    return c;
  }
  // Bounding box of everything that is not (near) white
  function bounds(c, maxY = c.height) {
    const { data, width } = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    const height = maxY;
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return { x0, y0, x1, y1 };
  }
  function square(src, b, size, { circle = false, pad = 0, bg = null } = {}) {
    const side = Math.max(b.x1 - b.x0, b.y1 - b.y0) + 1;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
    if (circle) { ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip(); }
    // Draw only the bounding box, scaled to fit and centred, so nothing outside it leaks in
    const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
    const scale = (size - pad * 2) / side;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, b.x0, b.y0, w, h, size / 2 - (w * scale) / 2, size / 2 - (h * scale) / 2, w * scale, h * scale);
    return c;
  }

  const seal = await render(1, 1600);
  const mono = await render(3, 1600);
  // Monogram only (crown, stars and M): stop above the "IMPRENTA MARÍA AUXILIADORA" wordmark, unreadable at icon size
  const sb = bounds(seal), mb = bounds(mono, Math.round(mono.height * 0.69));
  return {
    logo: square(seal, sb, 384, { circle: true }).toDataURL("image/webp", 0.9),
    favicon: square(mono, mb, 192, { pad: 10, bg: "#fff" }).toDataURL("image/png"),
    touch: square(mono, mb, 180, { pad: 18, bg: "#fff" }).toDataURL("image/png"),
    sealBounds: sb, monoBounds: mb,
  };
}, `${SERVER}/${encodeURI(PDF)}`);

const save = (file, dataUrl) => writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
save("assets/img/logo.webp", out.logo);
save("assets/img/favicon.png", out.favicon);
save("assets/img/apple-touch-icon.png", out.touch);
console.log("seal", out.sealBounds, "monogram", out.monoBounds);
console.log("assets/img/logo.webp, assets/img/favicon.png, assets/img/apple-touch-icon.png");
await browser.close();
