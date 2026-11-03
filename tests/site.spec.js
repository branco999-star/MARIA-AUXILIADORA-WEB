// @ts-check
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const WA_NUMBER = "51999759353";
const MOBILE = { width: 375, height: 800 };

// Scroll through the page so lazy images load and reveal animations run
async function scrollAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
}

test("loads with title, description, lang, viewport, favicon and Open Graph", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/María Auxiliadora/);
  await expect(page.locator("html")).toHaveAttribute("lang", /^es/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Chosica/);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /width=device-width/);
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
  for (const p of ["og:title", "og:description", "og:image", "og:type", "og:locale"]) {
    await expect(page.locator(`meta[property="${p}"]`)).toHaveCount(1);
  }
});

test("no console errors and no failed resources", async ({ page }) => {
  const errors = [];
  const failed = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  page.on("requestfailed", r => failed.push(`failed ${r.url()}`));
  await page.goto("/");
  await scrollAll(page);
  await page.waitForLoadState("networkidle");
  // Local files referenced from the head must exist too
  for (const href of ["assets/img/og.jpg", "assets/img/apple-touch-icon.png", "assets/img/logo.webp", "assets/img/favicon.png"]) {
    const r = await page.request.get("/" + href);
    if (!r.ok()) failed.push(`${r.status()} ${href}`);
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/");
  await scrollAll(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("mobile menu opens, closes and its links navigate", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/");
  const burger = page.locator("#burger");
  const menu = page.locator("#mobileMenu");
  await expect(burger).toBeVisible();
  await expect(menu).toBeHidden();
  await burger.click();
  await expect(menu).toBeVisible();
  await expect(burger).toHaveAttribute("aria-expanded", "true");
  await menu.getByRole("link", { name: "Contacto" }).click();
  await expect(menu).toBeHidden();
  await expect(burger).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/#contacto$/);
});

test("every internal link points to an existing section", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page.$$eval('a[href^="#"]:not([href="#"])', as => [...new Set(as.map(a => a.getAttribute("href")))]);
  expect(hrefs.length).toBeGreaterThan(5);
  for (const href of hrefs) {
    await expect(page.locator(href), href).toHaveCount(1);
  }
});

test("all main sections exist", async ({ page }) => {
  await page.goto("/");
  for (const id of ["inicio", "servicios", "promociones", "productos", "cuadros", "pedir", "contacto"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test("WhatsApp calls to action point to the business number", async ({ page }) => {
  await page.goto("/");
  const heroCta = page.locator(".hero a.btn-wa");
  await expect(heroCta).toBeVisible();
  await expect(heroCta).toHaveAttribute("href", new RegExp(`wa\\.me/${WA_NUMBER}`));
  await expect(page.locator("a.fab")).toBeVisible();
  const waLinks = await page.$$eval('a[href*="wa.me"]', as => as.map(a => a.href));
  for (const href of waLinks) expect(href).toContain(WA_NUMBER);
});

test("contact data is visible", async ({ page }) => {
  await page.goto("/");
  const contact = page.locator("#contacto");
  await contact.scrollIntoViewIfNeeded();
  for (const text of ["Av. 28 de Julio 422", "999 759 353", "992 262 028", "mayorgrafsac@gmail.com", "Lunes a sábado", "Yape", "Plin", "BCP", "BBVA", "Tunki", "Efectivo"]) {
    await expect(contact.getByText(text, { exact: false }).first()).toBeVisible();
  }
  await expect(page.locator('a[href="tel:+51992262028"]').first()).toBeVisible();
  await expect(page.locator('a[href="mailto:mayorgrafsac@gmail.com"]').first()).toBeVisible();
  await expect(page.locator("footer")).toContainText("RUC 20554569847");
});

test("promotion filters show only the chosen category", async ({ page }) => {
  await page.goto("/");
  const promos = page.locator("#galeria .promo");
  await expect(promos).toHaveCount(21);
  await page.locator('.filtro[data-f="vidrio"]').click();
  await expect(page.locator("#galeria .promo:not(.hide)")).toHaveCount(5);
  const cats = await page.$$eval("#galeria .promo:not(.hide)", els => els.map(e => e.dataset.cat));
  expect(new Set(cats)).toEqual(new Set(["vidrio"]));
  await page.locator('.filtro[data-f="todos"]').click();
  await expect(page.locator("#galeria .promo:not(.hide)")).toHaveCount(21);
});

test("lightbox opens from a promotion, links to WhatsApp and closes with Escape", async ({ page }) => {
  await page.goto("/");
  const first = page.locator("#galeria .promo").first();
  await first.click();
  const lb = page.locator("#lb");
  await expect(lb).toBeVisible();
  await expect(page.locator("#lbTitle")).toHaveText("Todo Cajas");
  await expect(page.locator("#lbWa")).toHaveAttribute("href", /wa\.me\/51999759353\?text=.*Todo%20Cajas/);
  await expect(page.locator("#lbClose")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#lbTitle")).toHaveText("Bolsas de papel kraft");
  await page.keyboard.press("Escape");
  await expect(lb).toBeHidden();
  await expect(first).toBeFocused();
});

test("promotion cards open with the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.locator("#galeria .promo").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#lb")).toBeVisible();
});

test("graduation frames gallery has 16 models and opens in the lightbox", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".cuadro")).toHaveCount(16);
  await page.locator(".cuadro").nth(2).click();
  await expect(page.locator("#lbTitle")).toHaveText("Mi Princesa KPOP");
  await expect(page.locator("#lbDesc")).toContainText("Brillante");
});

test("quote form opens WhatsApp with the filled-in message", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  await page.fill("#f-nombre", "Ana Prueba");
  await page.selectOption("#f-servicio", "Cajas personalizadas");
  await page.fill("#f-cant", "100 cajas");
  await page.fill("#f-msg", "Con logo a color");
  await page.getByRole("button", { name: /Enviar por WhatsApp/ }).click();
  const opened = await page.evaluate(() => window.__opened);
  expect(opened).toHaveLength(1);
  const msg = decodeURIComponent(opened[0]);
  expect(opened[0]).toContain(`wa.me/${WA_NUMBER}`);
  for (const t of ["Ana Prueba", "Cajas personalizadas", "100 cajas", "Con logo a color"]) expect(msg).toContain(t);
});

test("quote form requires a name", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  await page.getByRole("button", { name: /Enviar por WhatsApp/ }).click();
  expect(await page.evaluate(() => window.__opened.length)).toBe(0);
  expect(await page.locator("#f-nombre").evaluate(el => el.validity.valueMissing)).toBe(true);
});

test("one h1 and no skipped heading levels", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  const levels = await page.$$eval("h1,h2,h3,h4,h5,h6", hs => hs.map(h => Number(h.tagName[1])));
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i] - levels[i - 1], `heading #${i}`).toBeLessThanOrEqual(1);
  }
});

test("semantic landmarks exist", async ({ page }) => {
  await page.goto("/");
  for (const sel of ["header", "nav", "main", "footer"]) await expect(page.locator(sel).first()).toBeAttached();
  await expect(page.locator("main")).toHaveCount(1);
});

test("images have alt, size attributes, WebP and lazy loading below the fold", async ({ page }) => {
  await page.goto("/");
  const imgs = await page.$$eval("main img, nav img, footer img", els => els.map(i => ({
    src: i.getAttribute("src"), alt: i.getAttribute("alt"), w: i.getAttribute("width"), h: i.getAttribute("height"), lazy: i.getAttribute("loading"),
  })));
  expect(imgs.length).toBe(40);
  for (const i of imgs) {
    expect(i.alt, i.src).not.toBeNull();
    expect(i.w && i.h, i.src).toBeTruthy();
    expect(i.src).toMatch(/\.webp$/);
  }
  const eager = imgs.filter(i => i.lazy !== "lazy").map(i => i.src);
  expect(eager).toEqual(["assets/img/logo.webp", "assets/img/fachada.webp"]);
});

test("initial page weight is under 1.5 MB", async ({ page }) => {
  let bytes = 0;
  page.on("response", async r => {
    try { bytes += (await r.body()).length; } catch { /* redirects have no body */ }
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(bytes).toBeLessThan(1.5 * 1024 * 1024);
});

test("touch targets are at least 44x44 px on mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/");
  const small = await page.$$eval("#burger, #themeToggle, .filtro, .btn, .fab, .field input, .field select", els =>
    els.filter(e => e.offsetParent !== null || e.classList.contains("fab"))
      .map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 30), w: r.width, h: r.height }; })
      .filter(r => r.w < 44 || r.h < 44));
  expect(small).toEqual([]);
});

test("reduced motion: content is visible without animations", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const hidden = await page.$$eval(".rv", els => els.filter(e => getComputedStyle(e).opacity !== "1").length);
  expect(hidden).toBe(0);
  const anim = await page.$eval(".marquee-track", e => getComputedStyle(e).animationName);
  expect(anim).toBe("none");
  await context.close();
});

for (const colorScheme of ["light", "dark"]) for (const viewport of [MOBILE, { width: 1440, height: 900 }]) {
  test(`accessibility: no serious or critical axe violations at ${viewport.width}px (${colorScheme})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme });
    await page.goto("/");
    await scrollAll(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = results.violations
      .filter(v => v.impact === "serious" || v.impact === "critical")
      .map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 6).map(n => n.target.join(" ")).join(" | ")}`);
    expect(bad).toEqual([]);
  });
}

test("dark mode follows the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(11, 16, 35)");
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-pressed", "true");
});

test("theme toggle switches theme and remembers the choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.locator("#themeToggle");
  await expect(html).toHaveAttribute("data-theme", "light");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-label", "Activar modo claro");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0B1023");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("theme toggle is reachable on mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/");
  await expect(page.locator("#themeToggle")).toBeVisible();
  await expect(page.locator("#burger")).toBeVisible();
});

test("Outfit font is self-hosted and no third-party font requests are made", async ({ page }) => {
  const external = [];
  page.on("request", r => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => document.fonts.check('800 16px "Outfit"') && [...document.fonts].some(f => f.family.replace(/"/g, "") === "Outfit" && f.status === "loaded"));
  expect(loaded).toBe(true);
  expect(external).toEqual([]);
});

test("footer legal line uses the full width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const lines = await page.$eval(".f-bottom p", p => Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)));
  expect(lines).toBe(1);
});

test("Google Maps links and embedded map point to the store", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page.$$eval('a[href*="maps.app.goo.gl"]', as => as.map(a => a.href));
  expect(hrefs).toEqual(["https://maps.app.goo.gl/oevsQRWjF39uYiZ79", "https://maps.app.goo.gl/oevsQRWjF39uYiZ79"]);
  const map = page.locator(".mapa-embed iframe");
  await expect(map).toHaveAttribute("loading", "lazy");
  await expect(map).toHaveAttribute("title", /Imprenta María Auxiliadora/);
  expect(decodeURIComponent(await map.getAttribute("src"))).toContain("Imprenta+\"Maria+Auxiliadora\",+Prol.+28+de+Julio,+Lurigancho-Chosica+15468");
});

test.describe("category galleries", () => {
  const CATS = ["almanaques", "bolsas-kraft", "cajas-con-tu-logo", "cirios-velas-y-velones", "llaveros-y-souvenirs", "recuerdos-para-eventos", "cuadros-de-promocion", "diseno-grafico"];

  test("the service list has one gallery button per material folder, and no separate gallery section", async ({ page }) => {
    await page.goto("/");
    const ids = await page.$$eval(".servicios .chips .chip-gal", bs => bs.map(b => b.tagName + ":" + b.dataset.gal));
    expect(ids).toEqual(CATS.map(c => "BUTTON:" + c));
    await expect(page.locator("#trabajos")).toHaveCount(0);
    await expect(page.locator('a[href="#trabajos"]')).toHaveCount(0);
    const staticChips = await page.$$eval(".chips .chip:not(.chip-gal)", els => els.map(e => e.tagName));
    expect(staticChips.length).toBe(20);
    expect(new Set(staticChips)).toEqual(new Set(["DIV"]));
    await page.setViewportSize({ width: 1440, height: 900 });
    const [galW, chipW] = await page.evaluate(() => [".chip-gal", ".chip:not(.chip-gal)"].map(s => Math.round(document.querySelector(s).getBoundingClientRect().width)));
    expect(galW).toBe(chipW);
  });

  test("every gallery file listed in galeria.json exists", async ({ page }) => {
    const res = await page.request.get("/assets/galeria/galeria.json");
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.map(c => c.id)).toEqual(CATS);
    const missing = [];
    for (const c of data) {
      expect(c.items.length, c.id).toBeGreaterThan(0);
      for (const it of c.items) {
        for (const f of [it.src, it.thumb, it.poster].filter(Boolean)) {
          const r = await page.request.head("/" + f);
          if (!r.ok()) missing.push(f);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test("opening a category shows its photos and videos, and the viewer works with the keyboard", async ({ page }) => {
    await page.goto("/");
    const opener = page.locator('.chip-gal[data-gal="bolsas-kraft"]');
    await opener.click();
    const gal = page.locator("#gal");
    await expect(gal).toBeVisible();
    await expect(page.locator("#galTitle")).toHaveText("Bolsas kraft");
    await expect(page.locator("#galClose")).toBeFocused();
    await expect(page.locator("#galWa")).toHaveAttribute("href", /wa\.me\/51999759353\?text=.*Bolsas%20kraft/);
    const thumbs = page.locator("#galBody .gal-thumb");
    await expect(thumbs).toHaveCount(5);
    await expect(page.locator("#galBody .gal-play")).toHaveCount(1);
    await thumbs.first().click();
    await expect(page.locator("#galView")).toBeVisible();
    await expect(page.locator("#galMedia img")).toHaveAttribute("alt", "Bolsas kraft — foto 1");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#galMedia video")).toHaveCount(1);
    await expect(page.locator("#galMedia video")).toHaveAttribute("poster", /video-01\.webp$/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#galView")).toBeHidden();
    await expect(gal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(gal).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("catalog categories show one group per PDF", async ({ page }) => {
    await page.goto("/");
    await page.locator('.chip-gal[data-gal="recuerdos-para-eventos"]').click();
    await expect(page.locator("#galBody .gal-group h3")).toHaveCount(3);
    await expect(page.locator("#galBody .gal-thumb")).toHaveCount(128);
    await page.locator("#galBody .gal-thumb").nth(41).click();
    await expect(page.locator("#galMedia img")).toHaveAttribute("alt", "Catálogo de matrimonio — página 1");
  });

  test("gallery does not load anything until opened", async ({ page }) => {
    const requested = [];
    page.on("request", r => { if (r.url().includes("/assets/galeria/")) requested.push(r.url()); });
    await page.goto("/", { waitUntil: "networkidle" });
    expect(requested).toEqual([]);
  });

  for (const viewport of [{ width: 375, height: 800 }, { width: 1440, height: 900 }]) {
    test(`open gallery has no serious axe violations at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await page.locator('.chip-gal[data-gal="cajas-con-tu-logo"]').click();
      await expect(page.locator("#galBody .gal-thumb")).toHaveCount(5);
      let results = await new AxeBuilder({ page }).include("#gal").analyze();
      let bad = results.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id);
      expect(bad).toEqual([]);
      await page.locator("#galBody .gal-thumb").first().click();
      results = await new AxeBuilder({ page }).include("#gal").analyze();
      bad = results.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id);
      expect(bad).toEqual([]);
    });
  }
});

for (const width of [1024, 1199, 1200, 1280, 1440]) {
  test(`navigation bar fits inside the screen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const outside = await page.$$eval(".nav .wrap > *", (els, w) => els
      .filter(e => getComputedStyle(e).display !== "none")
      .filter(e => e.getBoundingClientRect().right > w).map(e => e.className), width);
    expect(outside).toEqual([]);
  });
}
