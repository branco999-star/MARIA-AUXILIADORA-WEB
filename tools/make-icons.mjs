// Usage: node tools/make-icons.mjs
// Builds the social share image (og.jpg, 1200x630) from the storefront photo.
// Logo, favicon and apple-touch-icon come from tools/make-logos.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const dataUri = file => `data:image/webp;base64,${readFileSync(file).toString("base64")}`;
const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<body style="margin:0"><img src="${dataUri("assets/img/fachada.webp")}"
  style="width:1200px;height:630px;object-fit:cover;display:block"></body>`);
await page.screenshot({ path: "assets/img/og.jpg", type: "jpeg", quality: 82 });

await browser.close();
console.log("assets/img/og.jpg");
