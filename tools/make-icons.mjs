// Usage: node tools/make-icons.mjs
// Builds the social share image (og.jpg, 1200x630) and apple-touch-icon.png (180x180) from existing assets
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const dataUri = file => `data:image/webp;base64,${readFileSync(file).toString("base64")}`;
const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<body style="margin:0"><img src="${dataUri("assets/img/fachada.webp")}"
  style="width:1200px;height:630px;object-fit:cover;display:block"></body>`);
await page.screenshot({ path: "assets/img/og.jpg", type: "jpeg", quality: 82 });

await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(`<body style="margin:0;background:#fff"><img src="${dataUri("assets/img/logo.webp")}"
  style="width:180px;height:180px;display:block"></body>`);
await page.screenshot({ path: "assets/img/apple-touch-icon.png" });

await browser.close();
console.log("assets/img/og.jpg, assets/img/apple-touch-icon.png");
