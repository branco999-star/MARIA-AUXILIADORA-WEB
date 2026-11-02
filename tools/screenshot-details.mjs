// Usage: node tools/screenshot-details.mjs <iteration>
// Viewport close-ups of key sections plus mobile menu and lightbox states, saved to screenshots/iteracion-N/
import { chromium } from "@playwright/test";
const [it] = process.argv.slice(2);
const b = await chromium.launch();
for (const [w, h, ids] of [[375, 812, ["inicio", "promociones", "productos", "contacto"]], [1440, 900, ["inicio", "cuadros"]], [768, 1024, ["inicio"]]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await p.evaluate(async () => { for (let y = 0; y < 25000; y += 400) { scrollTo({ top: y, behavior: "instant" }); await new Promise(r => setTimeout(r, 30)); } });
  for (const id of ids) {
    await p.evaluate(id => { const el = document.getElementById(id); scrollTo({ top: id === "inicio" ? 0 : el.getBoundingClientRect().top + scrollY - 90, behavior: "instant" }); }, id);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `screenshots/iteracion-${it}/detail-${w}-${id}.png` });
  }
  await p.close();
}
await b.close();
// Interactive states: mobile menu open and lightbox open
const b2 = await chromium.launch();
const m = await b2.newPage({ viewport: { width: 375, height: 812 } });
await m.goto("http://localhost:3000", { waitUntil: "networkidle" });
await m.click("#burger"); await m.waitForTimeout(300);
await m.screenshot({ path: `screenshots/iteracion-${it}/state-375-menu.png` });
await m.click("#burger");
await m.locator("#galeria .promo").nth(5).click(); await m.waitForTimeout(500);
await m.screenshot({ path: `screenshots/iteracion-${it}/state-375-lightbox.png` });
await b2.close();
