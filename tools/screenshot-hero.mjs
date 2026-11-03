// Usage: node tools/screenshot-hero.mjs <iteration> [light|dark]
// Captures each hero scene (0-3) at 375, 768 and 1440 px into screenshots/iteracion-N/hero-<width>-<scene>[-dark].png
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [it = "1", colorScheme = "light"] = process.argv.slice(2);
const out = `screenshots/iteracion-${it}`;
const sx = colorScheme === "dark" ? "-dark" : "";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.locator("#scenePause").click(); // freeze auto-advance while capturing
  for (const s of [0, 1, 2, 3]) {
    await page.locator(`.scene-dot[data-goto="${s}"]`).click();
    await page.mouse.move(0, h - 1);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(1600); // entrance animation + first video frame
    const box = await page.locator("#inicio").boundingBox();
    await page.screenshot({ path: `${out}/hero-${w}-${s}${sx}.png`, fullPage: true, clip: { x: 0, y: 0, width: w, height: Math.min(box.y + box.height, 2400) } });
  }
  await page.close();
}
await browser.close();
console.log(`${out}/hero-*${sx}.png`);
