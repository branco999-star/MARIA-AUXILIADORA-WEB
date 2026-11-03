// Usage: node tools/screenshot-servicios.mjs <iteration>
// Close-ups of the service carousel at rest, mid-transition and in dark mode, saved to screenshots/iteracion-N/
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const it = process.argv[2] || "1";
const out = `screenshots/iteracion-${it}`;
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
for (const [w, h, colorScheme] of [[375, 812, "light"], [768, 1024, "light"], [1440, 900, "light"], [1440, 900, "dark"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme });
  await p.goto("http://localhost:3000", { waitUntil: "networkidle" });
  if (colorScheme === "dark") await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  const stage = p.locator(".svc-stage");
  await stage.scrollIntoViewIfNeeded();
  await p.evaluate(() => scrollBy({ top: document.querySelector(".svc-stage").getBoundingClientRect().top - 120, behavior: "instant" }));
  await p.mouse.move(w / 2, 60);
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(900);
  const sx = colorScheme === "dark" ? "-dark" : "";
  await p.screenshot({ path: `${out}/servicios-${w}${sx}.png` });
  if (colorScheme === "light") {
    await p.locator(".svc-next").click();
    await p.waitForTimeout(220);
    await p.screenshot({ path: `${out}/servicios-${w}-mid.png` });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/servicios-${w}-next.png` });
  }
  await p.close();
}
await b.close();
console.log(`Saved to ${out}/`);
