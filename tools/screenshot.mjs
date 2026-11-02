// Usage: node tools/screenshot.mjs <url> <iteration> [light|dark]
// Saves full-page captures at 375, 768 and 1440 px to screenshots/iteracion-N/
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const url = process.argv[2] || "http://localhost:3000";
const iteration = process.argv[3] || "1";
const colorScheme = process.argv[4] || "light";
const suffix = colorScheme === "dark" ? "-dark" : "";
const outDir = `screenshots/iteracion-${iteration}`;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const width of [375, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
  await page.goto(url, { waitUntil: "networkidle" });
  // Scroll to the bottom so lazy images load and reveal animations fire
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  // Chromium leaves blank tiles in very tall fullPage captures, so grow the viewport to the page height instead
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${width}${suffix}.png` });
  await page.close();
  console.log(`${outDir}/${width}${suffix}.png`);
}
await browser.close();
