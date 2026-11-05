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
  const heroCta = page.locator('.hero .scene[data-scene="0"] a.btn-wa');
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
  expect(imgs.length).toBe(73);
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
  expect(hrefs).toEqual(Array(3).fill("https://maps.app.goo.gl/oevsQRWjF39uYiZ79"));
  const map = page.locator(".mapa-embed iframe");
  await expect(map).toHaveAttribute("loading", "lazy");
  await expect(map).toHaveAttribute("title", /Imprenta María Auxiliadora/);
  expect(decodeURIComponent(await map.getAttribute("src"))).toContain("Imprenta+\"Maria+Auxiliadora\",+Prol.+28+de+Julio,+Lurigancho-Chosica+15468");
});

// Pick a service in the "all services" panel (which also pauses autoplay)
async function pickService(page, title) {
  await page.locator(".svc-open").click();
  await page.locator(".svc-tabs").getByRole("button", { name: title, exact: true }).click();
  await expect(page.locator(".svc-panel")).toBeHidden();
}

// Bring a service card to the centre of the carousel and open its gallery
async function openService(page, id) {
  const card = page.locator(`.svc-card[data-gal="${id}"]`);
  const title = await card.getAttribute("data-title");
  await pickService(page, title);
  await expect(card).toHaveClass(/\bon\b/);
  await card.click();
  return card;
}

test.describe("category galleries", () => {
  const CATS = ["almanaques", "bolsas-kraft", "cajas-con-tu-logo", "cirios-velas-y-velones", "llaveros-y-souvenirs", "invitaciones", "cuadros-de-promocion", "diseno-grafico",
    "impresiones-y-copias", "diagramacion", "sellos", "serigrafia", "enmicados", "empastados", "corte-y-anillado", "tarjetas-y-volantes",
    "placas-de-reconocimiento", "copas-personalizadas", "imagenes-de-santos", "sobres-y-folders", "agendas", "libros-contables",
    "cintas-de-embalaje-y-film", "escaneos", "tipeos", "creacion-de-paginas-web", "diplomas"];

  test("the service carousel has one gallery card per material folder, and no separate gallery section", async ({ page }) => {
    await page.goto("/");
    const ids = await page.$$eval(".servicios .svc-track .svc-card", bs => bs.map(b => b.tagName + ":" + b.dataset.gal));
    expect(ids).toEqual(CATS.map(c => "BUTTON:" + c));
    await expect(page.locator("#trabajos")).toHaveCount(0);
    await expect(page.locator('a[href="#trabajos"]')).toHaveCount(0);
    // Every service now has its own gallery card: the plain list of services is gone
    await expect(page.locator(".chips")).toHaveCount(0);
  });

  test("the new services open their own photo galleries", async ({ page }) => {
    await page.goto("/");
    await page.locator(".svc-stage").scrollIntoViewIfNeeded();
    for (const [id, n] of [["sellos", 7], ["serigrafia", 3], ["corte-y-anillado", 2], ["empastados", 1], ["tarjetas-y-volantes", 2], ["placas-de-reconocimiento", 6], ["sobres-y-folders", 4], ["diplomas", 5]]) {
      await openService(page, id);
      await expect(page.locator("#gal")).toBeVisible();
      await expect(page.locator("#gal img")).toHaveCount(n);
      await page.keyboard.press("Escape");
      await expect(page.locator("#gal")).toBeHidden();
    }
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
    const opener = await openService(page, "bolsas-kraft");
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
    await openService(page, "invitaciones");
    await expect(page.locator("#galBody .gal-group h3")).toHaveCount(3);
    await expect(page.locator("#galBody .gal-thumb")).toHaveCount(128);
    await page.locator("#galBody .gal-thumb").nth(41).click();
    await expect(page.locator("#galMedia img")).toHaveAttribute("alt", "Catálogo de matrimonio — página 1");
  });

  test("gallery does not load anything until opened, beyond the carousel cover thumbnails", async ({ page }) => {
    const requested = [];
    page.on("request", r => { if (r.url().includes("/assets/galeria/")) requested.push(new URL(r.url()).pathname.slice(1)); });
    await page.goto("/", { waitUntil: "networkidle" });
    const covers = await page.$$eval(".svc-card img", imgs => imgs.map(i => i.getAttribute("src")));
    expect(covers).toHaveLength(27);
    expect(covers.every(c => /-mini\.webp$/.test(c))).toBe(true);
    expect(requested.filter(u => !covers.includes(u))).toEqual([]);
  });

  for (const viewport of [{ width: 375, height: 800 }, { width: 1440, height: 900 }]) {
    test(`open gallery has no serious axe violations at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await openService(page, "cajas-con-tu-logo");
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

test.describe("hero almanac campaign scenes", () => {
  const ALMANAC_WA = "wa.me/51999759353?text=Hola%2C%20quiero%20cotizar%20almanaques%202027%20para%20mi%20negocio.";

  test("six scenes, only the first visible, still one h1", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#inicio .scene")).toHaveCount(6);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('#inicio .scene[data-scene="0"]')).toBeVisible();
    for (const i of [1, 2, 3, 4, 5]) {
      const s = page.locator(`#inicio .scene[data-scene="${i}"]`);
      await expect(s).toHaveAttribute("aria-hidden", "true");
      await expect(s).toHaveAttribute("inert", "");
    }
  });

  test("hero videos are muted, inline, not preloaded, and nothing is downloaded at load", async ({ page }) => {
    const videoRequests = [];
    page.on("request", r => { if (r.url().includes("/assets/video/") && r.url().endsWith(".mp4")) videoRequests.push(r.url()); });
    await page.goto("/", { waitUntil: "networkidle" });
    const vids = await page.$$eval("#inicio video", vs => vs.map(v => ({ muted: v.muted, inline: v.hasAttribute("playsinline"), preload: v.getAttribute("preload"), src: v.getAttribute("src"), poster: v.getAttribute("poster") })));
    expect(vids).toHaveLength(3);
    for (const v of vids) {
      expect(v.muted).toBe(true);
      expect(v.inline).toBe(true);
      expect(v.preload).toBe("none");
      expect(v.src).toBeNull();
      expect(v.poster).toMatch(/\.webp$/);
    }
    expect(videoRequests).toEqual([]);
  });

  test("progress bars jump to a scene; the last one shows the big almanac CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Ver escena 4/ }).click();
    const last = page.locator('#inicio .scene[data-scene="3"]');
    await expect(last).toBeVisible();
    await expect(last).not.toHaveAttribute("aria-hidden", "true");
    const cta = last.getByRole("link", { name: /Cotizar almanaques por WhatsApp/ });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "https://" + ALMANAC_WA);
    await expect(page.locator("#inicio")).toHaveAttribute("data-scene", "3");
    await expect(page.locator('#inicio .scene[data-scene="0"]')).toHaveAttribute("aria-hidden", "true");
  });

  test("teaser in the first scene opens the campaign", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Campaña Almanaques 2027/ }).click();
    await expect(page.locator("#inicio")).toHaveAttribute("data-scene", "1");
  });

  test("scenes advance automatically and the pause button stops them", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    const hero = page.locator("#inicio");
    await page.mouse.move(5, 5);
    await page.clock.runFor(15100);
    await expect(hero).toHaveAttribute("data-scene", "1");
    await page.locator("#scenePause").click();
    await expect(page.locator("#scenePause")).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(5, 5);
    await page.clock.runFor(20000);
    await expect(hero).toHaveAttribute("data-scene", "1");
    await page.locator("#scenePause").click();
    await page.mouse.move(5, 5);
    await page.locator("#scenePause").blur();
    await page.clock.runFor(15100);
    await expect(hero).toHaveAttribute("data-scene", "2");
  });

  test("advances on its own from the very first scene, even with the mouse over it or reduced motion", async ({ browser }) => {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const context = await browser.newContext({ reducedMotion, viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.clock.install();
      await page.goto("/");
      const hero = page.locator("#inicio");
      await page.mouse.move(700, 500); // pointer resting on the hero
      await page.clock.runFor(15100);
      await expect(hero, reducedMotion).toHaveAttribute("data-scene", "1");
      await expect(page.locator("#scenePause")).toHaveAttribute("aria-pressed", "false");
      // Clicking a progress bar must not leave it stuck afterwards
      await page.getByRole("button", { name: /Ver escena 3/ }).click();
      await page.clock.runFor(15100);
      await expect(hero, reducedMotion).toHaveAttribute("data-scene", "3");
      await context.close();
    }
  });

  test("subtle arrows move to the previous and next scene, wrapping around", async ({ page }) => {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const hero = page.locator("#inicio");
      const next = page.getByRole("button", { name: "Escena siguiente" });
      const prev = page.getByRole("button", { name: "Escena anterior" });
      await expect(next).toBeVisible();
      await expect(prev).toBeVisible();
      await next.click();
      await expect(hero).toHaveAttribute("data-scene", "1");
      await prev.click();
      await prev.click();
      await expect(hero).toHaveAttribute("data-scene", "5");
      const box = await next.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  });

  test("'Mira el catálogo' in the campaign scenes opens the 2027 catalog", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Ver escena 2/ }).click();
    const btn = page.locator('#inicio .scene[data-scene="1"] [data-catalogo]');
    await expect(btn).toHaveText("Mira el catálogo");
    await btn.click();
    await expect(page.locator("#cat")).toBeVisible();
    await expect(page.locator("#catCount")).toHaveText(/^Página 1 de 66$/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#cat")).toBeHidden();
    await expect(btn).toBeFocused();
    // The almanac gallery is still one tap away from the services carousel
    await expect(page.locator('.svc-card[data-gal="almanaques"] small')).toHaveText("1 foto · 3 vídeos");
  });

  test("after the campaign, scene 5 shows the opening hours ad and scene 6 the payment ad", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ver escena 5: Horario" }).click();
    const hours = page.locator('#inicio .scene[data-scene="4"]');
    await expect(hours).toBeVisible();
    await expect(hours).toContainText("Estamos atendiendo");
    await expect(hours).toContainText("8:00 a.m. a 8:00 p.m.");
    await expect(hours.locator("img")).toHaveAttribute("src", "assets/img/anuncio-horario.webp");
    await expect(hours.getByRole("link", { name: /Cómo llegar/ })).toHaveAttribute("href", "https://maps.app.goo.gl/oevsQRWjF39uYiZ79");
    await page.getByRole("button", { name: "Ver escena 6: Pagos" }).click();
    const pay = page.locator('#inicio .scene[data-scene="5"]');
    await expect(pay).toBeVisible();
    await expect(pay).toContainText("RUC 20554569847");
    await expect(pay.locator(".accounts dd")).toHaveText(["191-2163491-0-43", "00219100216349104350", "0011-0345-0200665607"]);
    await expect(pay.locator("img")).toHaveAttribute("src", "assets/img/anuncio-pagos.webp");
    for (const img of ["anuncio-horario.webp", "anuncio-pagos.webp"]) {
      expect((await page.request.get("/assets/img/" + img)).status()).toBe(200);
    }
    // The last scene wraps around to the first one
    await page.getByRole("button", { name: "Escena siguiente" }).click();
    await expect(page.locator("#inicio")).toHaveAttribute("data-scene", "0");
  });

  for (const scene of [1, 2, 3, 4, 5]) {
    test(`scene ${scene + 1} has no serious axe violations and no horizontal scroll on mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await page.getByRole("button", { name: new RegExp(`Ver escena ${scene + 1}`) }).click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).include("#inicio").analyze();
      expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id)).toEqual([]);
    });
  }
});

test.describe("hero video sound", () => {
  test("videos start muted; the sound button and the hint turn sound on and off", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Ver escena 2/ }).click();
    const hint = page.locator('#inicio .scene[data-scene="1"] .sound-hint');
    await expect(hint).toBeVisible();
    const sound = page.locator("#sceneSound");
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await hint.click();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await expect(sound).toHaveAttribute("aria-label", "Silenciar");
    await expect(hint).toBeHidden();
    const v1 = page.locator('#inicio .scene[data-scene="1"] video');
    expect(await v1.evaluate(v => v.muted)).toBe(false);
    await page.getByRole("button", { name: /Ver escena 3/ }).click();
    expect(await page.locator('#inicio .scene[data-scene="2"] video').evaluate(v => v.muted)).toBe(false);
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    expect(await page.$$eval("#inicio video", vs => vs.every(v => v.muted))).toBe(true);
  });

  test("hero clips and gallery videos carry an audio track", async ({ page }) => {
    await page.goto("/");
    await openService(page, "almanaques");
    await page.locator("#galBody .gal-thumb").nth(1).click();
    const v = page.locator("#galMedia video");
    await expect(v).toHaveAttribute("controls", "");
    expect(await v.evaluate(el => el.muted)).toBe(false);
  });
});

test.describe("service carousel", () => {
  const active = page => page.locator(".svc-card.on");
  const activeColor = page => page.$$eval(".svc-color", els => els.findIndex(e => e.classList.contains("on")));
  const pill = (page, name) => page.locator(".svc-tabs").getByRole("button", { name, exact: true });
  const PILLS = ["Almanaques", "Bolsas kraft", "Cajas con tu logo", "Cirios, velas y velones", "Llaveros y souvenirs", "Invitaciones", "Cuadros de promoción", "Diseño gráfico",
    "Impresiones y copias", "Diagramación", "Sellos", "Serigrafía", "Enmicados", "Empastados", "Corte y anillado", "Tarjetas y volantes",
    "Placas de reconocimiento", "Copas personalizadas", "Imágenes de santos", "Sobres y folders", "Agendas", "Libros contables",
    "Cintas de embalaje y film", "Escaneos", "Tipeos", "Creación de páginas web", "Diplomas"];

  test("a single button opens every service as icons; picking one jumps to its card without opening the gallery", async ({ page }) => {
    await page.goto("/");
    await page.locator(".svc-stage").scrollIntoViewIfNeeded();
    const open = page.getByRole("button", { name: /todos los servicios/ });
    await expect(open).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".svc-panel")).toBeHidden();
    await open.click();
    await expect(open).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".svc-tabs .svc-dot")).toHaveText(PILLS);
    await expect(page.locator(".svc-tabs .svc-dot .svc-app svg")).toHaveCount(PILLS.length);
    const order = await page.$$eval(".svc-card", els => els.map(e => e.dataset.title));
    expect(order).toEqual(PILLS);
    await pill(page, "Invitaciones").click();
    await expect(page.locator(".svc-panel")).toBeHidden();
    await expect(open).toHaveAttribute("aria-expanded", "false");
    await expect(active(page)).toHaveAttribute("data-gal", "invitaciones");
    await expect(active(page)).toBeFocused();
    await expect(page.locator(".svc-dot", { hasText: "Invitaciones" })).toHaveAttribute("aria-current", "true");
    await expect(page.locator(".svc-tabs [aria-current]")).toHaveCount(1);
    await expect(page.locator("#gal")).toBeHidden();
  });

  test("on desktop every service icon fits inside the open board", async ({ page }) => {
    await page.goto("/");
    await page.locator(".svc-stage").scrollIntoViewIfNeeded();
    await page.locator(".svc-open").click();
    await page.waitForFunction(() => document.querySelector(".svc-panel").getAnimations({ subtree: true }).length === 0);
    const panel = await page.locator(".svc-panel").boundingBox();
    const boxes = await page.locator(".svc-tabs > button").evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));
    expect(boxes).toHaveLength(PILLS.length + 1);
    for (const b of boxes) {
      expect(b.top).toBeGreaterThanOrEqual(panel.y);
      expect(b.bottom).toBeLessThanOrEqual(panel.y + panel.height);
    }
    await page.keyboard.press("Escape");
    await expect(page.locator(".svc-stage")).toHaveAttribute("style", /^(?!.*min-height)/);
  });

  test("the services panel closes with its centre button, Escape or tabbing out, and focus returns to the launcher", async ({ page }) => {
    await page.goto("/");
    await page.locator(".svc-stage").scrollIntoViewIfNeeded();
    const open = page.locator(".svc-open");
    await open.click();
    await expect(pill(page, "Almanaques")).toBeFocused();
    await page.getByRole("button", { name: "Cerrar la lista de servicios" }).click();
    await expect(page.locator(".svc-panel")).toBeHidden();
    await expect(open).toBeFocused();
    await open.press("Enter");
    await expect(page.locator(".svc-panel")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(active(page)).toHaveAttribute("data-gal", "almanaques");
    await page.keyboard.press("Escape");
    await expect(page.locator(".svc-panel")).toBeHidden();
    await expect(open).toBeFocused();
    await open.press("Enter");
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator(".svc-panel")).toBeHidden();
  });

  test("on mobile the services panel shows four icons per row inside the stage, with the close button in the corner", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.locator(".svc-stage").scrollIntoViewIfNeeded();
    await page.locator(".svc-open").click();
    await page.waitForFunction(() => document.querySelector(".svc-panel").getAnimations({ subtree: true }).length === 0);
    const stage = await page.locator(".svc-stage").boundingBox();
    const boxes = await page.locator(".svc-tabs > button").evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));
    expect(boxes).toHaveLength(PILLS.length + 1);
    for (const b of boxes) {
      expect(b.left).toBeGreaterThanOrEqual(stage.x);
      expect(b.right).toBeLessThanOrEqual(stage.x + stage.width);
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    const panel = await page.locator(".svc-panel").boundingBox();
    for (const b of boxes) {
      expect(b.top).toBeGreaterThanOrEqual(panel.y);
      expect(b.bottom).toBeLessThanOrEqual(panel.y + panel.height);
    }
    expect(new Set(boxes.slice(0, PILLS.length).map(b => Math.round(b.top))).size).toBe(Math.ceil(PILLS.length / 4));
    const close = boxes[PILLS.length];
    expect(close.right).toBeGreaterThan(panel.x + panel.width - 60);
    expect(close.top).toBeLessThan(panel.y + 60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(MOBILE.width);
  });

  test("autoplay stops for good once the visitor picks a service", async ({ page }) => {
    await page.goto("/");
    await page.locator(".svc-stage").scrollIntoViewIfNeeded();
    await pickService(page, "Cajas con tu logo");
    await page.mouse.move(1, 1);
    await page.locator("body").evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(4500);
    await expect(active(page)).toHaveAttribute("data-gal", "cajas-con-tu-logo");
  });

  test("arrows, keys and dots move the deck, the stage colour and the current dot", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator(".svc-stage");
    await stage.scrollIntoViewIfNeeded();
    await expect(active(page)).toHaveAttribute("data-gal", "almanaques");
    await expect(page.locator(".svc-card[inert]")).toHaveCount(PILLS.length - 3);
    await page.getByRole("button", { name: "Servicio siguiente" }).click();
    await expect(active(page)).toHaveAttribute("data-gal", "bolsas-kraft");
    expect(await activeColor(page)).toBe(1);
    await expect(page.locator(".svc-dot", { hasText: "Bolsas kraft" })).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("ArrowRight");
    await expect(active(page)).toHaveAttribute("data-gal", "cajas-con-tu-logo");
    await page.keyboard.press("ArrowLeft");
    await expect(active(page)).toHaveAttribute("data-gal", "bolsas-kraft");
    await pickService(page, "Cuadros de promoción");
    await expect(active(page)).toHaveAttribute("data-gal", "cuadros-de-promocion");
    expect(await activeColor(page)).toBe(6);
    await page.getByRole("button", { name: "Servicio siguiente" }).click();
    await expect(active(page)).toHaveAttribute("data-gal", "diseno-grafico");
    await pickService(page, "Diplomas");
    await expect(active(page)).toHaveAttribute("data-gal", "diplomas");
    await page.getByRole("button", { name: "Servicio siguiente" }).click();
    await expect(active(page)).toHaveAttribute("data-gal", "almanaques");
    await page.getByRole("button", { name: "Servicio anterior" }).click();
    await expect(active(page)).toHaveAttribute("data-gal", "diplomas");
  });

  test("plays on its own once visible", async ({ page }) => {
    await page.goto("/");
    await page.locator(".svc-stage").scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await expect(active(page)).toHaveAttribute("data-gal", "almanaques");
    await expect(active(page)).toHaveAttribute("data-gal", "bolsas-kraft", { timeout: 6000 });
  });

  test("does not play on its own with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".svc-stage").scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await page.waitForTimeout(4500);
    await expect(active(page)).toHaveAttribute("data-gal", "almanaques");
  });

  test("swipes on touch screens without opening a gallery", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    const track = page.locator(".svc-track");
    await track.scrollIntoViewIfNeeded();
    const swipe = async (from, to) => {
      await page.locator(".svc-card.on").dispatchEvent("pointerdown", { pointerType: "touch", clientX: from, bubbles: true });
      await page.locator(".svc-card.on").dispatchEvent("pointerup", { pointerType: "touch", clientX: to, bubbles: true });
      await page.locator(".svc-card.on").dispatchEvent("click", { bubbles: true });
    };
    await swipe(300, 120);
    await expect(active(page)).toHaveAttribute("data-gal", "bolsas-kraft");
    await expect(page.locator("#gal")).toBeHidden();
    await swipe(80, 300);
    await expect(active(page)).toHaveAttribute("data-gal", "almanaques");
    await expect(page.locator("#gal")).toBeHidden();
  });

  for (const viewport of [MOBILE, { width: 1440, height: 900 }]) {
    test(`has no serious axe violations at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await scrollAll(page);
      await page.locator(".svc-stage").scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page }).include(".svc-stage").analyze();
      expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id)).toEqual([]);
      await page.locator(".svc-open").click();
      const open = await new AxeBuilder({ page }).include(".svc-stage").analyze();
      expect(open.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id)).toEqual([]);
    });
  }
});

test.describe("calendar catalog 2027", () => {
  const DESKTOP = { width: 1440, height: 900 };
  const count = page => page.locator("#catCount");
  const pageSrc = (n) => `assets/catalogo/pagina-${String(n).padStart(2, "0")}.webp`;

  test("all 66 pages and thumbnails exist, page 1 is our own cover and the supplier's last pages are gone", async ({ page }) => {
    for (let n = 1; n <= 66; n++) {
      for (const f of [pageSrc(n), pageSrc(n).replace(".webp", "-mini.webp")]) {
        const res = await page.request.get("/" + f);
        expect(res.status(), f).toBe(200);
      }
    }
    expect((await page.request.get("/assets/catalogo/pagina-67.webp")).status()).toBe(404);
    // Our cover is 1162x1354, the supplier's pages are 1400 wide
    await page.goto("/");
    const widths = await page.evaluate(async srcs => Promise.all(srcs.map(s => new Promise(r => {
      const i = new Image(); i.onload = () => r(i.naturalWidth); i.src = s;
    }))), [pageSrc(1), pageSrc(2)]);
    expect(widths).toEqual([1162, 1400]);
  });

  test("catalog pages are not downloaded until the viewer opens, and then only nearby pages", async ({ page }) => {
    const requested = [];
    page.on("request", r => { if (/\/assets\/catalogo\/pagina-\d+\.webp/.test(r.url())) requested.push(r.url()); });
    await page.goto("/", { waitUntil: "networkidle" });
    await scrollAll(page);
    expect(requested).toEqual([]);
    await page.locator("#calendarios-2027 .btn-cat").click();
    await expect(page.locator("#cat")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(requested.length).toBeGreaterThan(0);
    expect(requested.length).toBeLessThanOrEqual(5);
  });

  test("book mode on desktop: cover alone, then two pages per spread, with arrows, keys, Home and End", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await page.locator("#calendarios-2027 .btn-cat").click();
    await expect(count(page)).toHaveText("Página 1 de 66");
    await expect(page.locator("#catPrev")).toBeDisabled();
    await expect(page.locator(".cat-right img")).toHaveAttribute("src", pageSrc(1));
    await page.locator("#catNext").click();
    await expect(count(page)).toHaveText("Páginas 2 y 3 de 66");
    await expect(page.locator(".cat-left img")).toHaveAttribute("src", pageSrc(2));
    await expect(page.locator(".cat-right img")).toHaveAttribute("src", pageSrc(3));
    await page.keyboard.press("ArrowRight");
    await expect(count(page)).toHaveText("Páginas 4 y 5 de 66");
    await page.keyboard.press("ArrowLeft");
    await expect(count(page)).toHaveText("Páginas 2 y 3 de 66");
    await page.keyboard.press("End");
    await expect(count(page)).toHaveText("Página 66 de 66");
    await expect(page.locator("#catNext")).toBeDisabled();
    await page.keyboard.press("Home");
    await expect(count(page)).toHaveText("Página 1 de 66");
    await expect(page).toHaveURL(/#catalogo-1$/);
  });

  test("one page at a time on phones, turning by swipe and by tapping the page", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.locator("#calendarios-2027 .btn-cat").click();
    await expect(count(page)).toHaveText("Página 1 de 66");
    const book = page.locator("#catBook");
    const box = await book.boundingBox();
    await book.dispatchEvent("pointerdown", { pointerType: "touch", clientX: box.x + box.width - 20, bubbles: true });
    await book.dispatchEvent("pointerup", { pointerType: "touch", clientX: box.x + 20, bubbles: true });
    await book.dispatchEvent("click", { clientX: box.x + 20, bubbles: true });
    await expect(count(page)).toHaveText("Página 2 de 66");
    await page.mouse.click(box.x + box.width * .8, box.y + box.height / 2);
    await expect(count(page)).toHaveText("Página 3 de 66");
    await page.mouse.click(box.x + box.width * .2, box.y + box.height / 2);
    await expect(count(page)).toHaveText("Página 2 de 66");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("index jumps to a section; WhatsApp quotes the page being viewed", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await page.locator("#calendarios-2027 .btn-cat").click();
    await page.locator("#catIndexBtn").click();
    await expect(page.locator("#catIndex")).toBeVisible();
    await expect(page.locator("#catThumbs .cat-thumb")).toHaveCount(66);
    await page.locator(".cat-sec", { hasText: "Imágenes 2027" }).click();
    await expect(page.locator("#catIndex")).toBeHidden();
    await expect(count(page)).toHaveText("Páginas 36 y 37 de 66");
    const wa = decodeURIComponent(await page.locator("#catWa").getAttribute("href"));
    expect(wa).toContain("wa.me/51999759353");
    expect(wa).toContain("me interesa lo de las páginas 36 y 37.");
  });

  test("zoom shows the visible pages large and Escape steps back layer by layer", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/#catalogo-10");
    await expect(page.locator("#cat")).toBeVisible();
    await expect(count(page)).toHaveText("Páginas 10 y 11 de 66");
    await page.locator("#catZoomBtn").click();
    await expect(page.locator("#catZoomBody img")).toHaveCount(2);
    await expect(page.locator("#catZoomClose")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#catZoom")).toBeHidden();
    await expect(page.locator("#cat")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#cat")).toBeHidden();
    await expect(page).not.toHaveURL(/#catalogo/);
  });

  for (const viewport of [MOBILE, DESKTOP]) {
    test(`buttons jump straight to the cover and to the last page at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/#catalogo-20");
      const first = page.getByRole("button", { name: "Ir a la portada" });
      const last = page.getByRole("button", { name: "Ir a la última página" });
      await last.click();
      await expect(count(page)).toHaveText("Página 66 de 66");
      await expect(last).toBeDisabled();
      await expect(page.locator("#catNext")).toBeDisabled();
      await first.click();
      await expect(count(page)).toHaveText("Página 1 de 66");
      await expect(first).toBeDisabled();
      await expect(last).toBeEnabled();
      // All five controls fit on the screen without overlapping
      const boxes = await page.$$eval(".cat-foot > *", els => els.map(e => e.getBoundingClientRect()).map(r => [r.left, r.right]));
      expect(boxes[0][0]).toBeGreaterThanOrEqual(0);
      expect(boxes[boxes.length - 1][1]).toBeLessThanOrEqual(viewport.width);
      for (let i = 1; i < boxes.length; i++) expect(boxes[i][0]).toBeGreaterThanOrEqual(boxes[i - 1][1]);
    });
  }

  test("turns pages without the flip animation when reduced motion is on", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#catalogo-2");
    await page.locator("#catNext").click();
    await expect(count(page)).toHaveText("Páginas 4 y 5 de 66");
    await expect(page.locator(".cat-leaf")).toHaveClass("cat-leaf");
    expect(await page.evaluate(() => document.querySelector(".cat-leaf").getAnimations().length)).toBe(0);
  });

  test("shared links open the right page; the cover in the last hero scene opens the catalog", async ({ page }) => {
    await page.goto("/#catalogo-99");
    await expect(page.locator("#cat")).toBeVisible();
    await page.locator("#catClose").click();
    await page.goto("/");
    await page.getByRole("button", { name: /Ver escena 4/ }).click();
    await page.getByRole("button", { name: "Ábreme: catálogo de calendarios 2027" }).first().click();
    await expect(page.locator("#cat")).toBeVisible();
    await expect(page.locator("#catClose")).toBeFocused();
  });

  for (const viewport of [MOBILE, DESKTOP]) {
    test(`viewer and band have no serious axe violations at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await scrollAll(page);
      let results = await new AxeBuilder({ page }).include("#calendarios-2027").analyze();
      expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id)).toEqual([]);
      await page.locator("#calendarios-2027 .btn-cat").click();
      await page.locator("#catIndexBtn").click();
      results = await new AxeBuilder({ page }).include("#cat").analyze();
      expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id)).toEqual([]);
    });
  }
});

test.describe("catalog visibility", () => {
  const strip = page => page.locator(".camp-strip-btn");
  const float = page => page.locator("#catFloat");

  for (const viewport of [MOBILE, { width: 1440, height: 900 }]) {
    test(`the red campaign strip is the very first thing on the page at ${viewport.width}px and opens the catalog`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      expect(await page.evaluate(() => document.body.firstElementChild.className)).toBe("camp-strip");
      const box = await strip(page).boundingBox();
      expect(box.y).toBe(0);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      await expect(strip(page)).toContainText("Catálogo de calendarios 2027");
      await strip(page).click();
      await expect(page.locator("#cat")).toBeVisible();
      await expect(page.locator("#catCount")).toHaveText("Página 1 de 66");
      await page.keyboard.press("Escape");
      await expect(strip(page)).toBeFocused();
    });

    test(`the floating mini cover shows up, opens the catalog and stays clear of WhatsApp at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(float(page)).toBeVisible();
      const [f, wa] = await Promise.all([float(page).boundingBox(), page.locator("a.fab").boundingBox()]);
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x + f.width).toBeLessThan(wa.x);
      await page.getByRole("button", { name: "Catálogo 2027: ábrelo" }).click();
      await expect(page.locator("#cat")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Catálogo 2027: ábrelo" })).toBeFocused();
    });
  }

  test("the mini cover is bigger on desktop than on phones and its label stays on screen", async ({ page }) => {
    const sizes = {};
    for (const viewport of [MOBILE, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(float(page)).toBeVisible();
      await page.waitForTimeout(2000);
      const img = await page.locator(".cat-float-open img").boundingBox();
      const tag = await page.locator(".cat-float-tag").boundingBox();
      sizes[viewport.width] = img.width;
      expect(tag.y + tag.height).toBeLessThanOrEqual(viewport.height);
    }
    expect(sizes[1440]).toBeGreaterThanOrEqual(100);
    expect(sizes[MOBILE.width]).toBeLessThan(75);
  });

  test("closing the mini cover hides it for the rest of the visit", async ({ page }) => {
    await page.goto("/");
    await expect(float(page)).toBeVisible();
    await page.getByRole("button", { name: "Ocultar catálogo" }).click();
    await expect(float(page)).toBeHidden();
    await page.reload();
    await expect(float(page)).toBeHidden();
    // The strip is still there to reach the catalog
    await expect(strip(page)).toBeVisible();
  });

  test("the mini cover steps aside while the mobile menu is open", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await expect(float(page)).toBeVisible();
    await page.locator("#burger").click();
    await expect(float(page)).toHaveCSS("pointer-events", "none");
    await page.locator("#burger").click();
    await expect(float(page)).not.toHaveCSS("pointer-events", "none");
  });

  for (const viewport of [MOBILE, { width: 1440, height: 900 }]) {
    test(`strip and mini cover have no serious axe violations at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await expect(float(page)).toBeVisible();
      const results = await new AxeBuilder({ page }).include(".camp-strip").include("#catFloat").analyze();
      expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id)).toEqual([]);
    });
  }
});

test.describe("catalog page-turn sound", () => {
  // Count the synthesised sounds by wrapping AudioBufferSourceNode.start before the page loads
  const countSounds = page => page.addInitScript(() => {
    window.__sounds = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () { window.__sounds++; return start.apply(this, arguments); };
  });
  const sounds = page => page.evaluate(() => window.__sounds);

  test("turning a page plays a generated paper sound, with no audio file downloaded", async ({ page }) => {
    await countSounds(page);
    const audioFiles = [];
    page.on("request", r => { if (r.resourceType() === "media" || /\.(mp3|ogg|wav|m4a)$/.test(r.url())) audioFiles.push(r.url()); });
    await page.goto("/#catalogo-1");
    await expect(page.locator("#cat")).toBeVisible();
    await expect(page.locator("#catSoundBtn")).toHaveAttribute("aria-pressed", "true");
    expect(await sounds(page)).toBe(0);
    await page.locator("#catNext").click();
    await expect.poll(() => sounds(page)).toBeGreaterThan(0);
    expect(audioFiles).toEqual([]);
  });

  test("the speaker button mutes the sound and the choice is remembered", async ({ page }) => {
    await countSounds(page);
    await page.goto("/#catalogo-1");
    const btn = page.getByRole("button", { name: "Sonido", exact: true });
    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await page.locator("#catNext").click();
    await expect(page.locator("#catCount")).toContainText("2");
    await page.waitForTimeout(800);
    expect(await sounds(page)).toBe(0);
    await page.reload();
    await expect(page.getByRole("button", { name: "Sonido", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Sonido", exact: true }).click();
    await page.locator("#catNext").click();
    await expect.poll(() => sounds(page)).toBeGreaterThan(0);
  });

  test("on mobile every viewer tool keeps a 44px touch target and the bar fits", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/#catalogo-1");
    await expect(page.locator("#cat")).toBeVisible();
    const sizes = await page.locator(".cat-top > button, .cat-top > a").evaluateAll(els => els.map(e => e.getBoundingClientRect().width));
    for (const w of sizes) expect(w).toBeGreaterThanOrEqual(44);
    await expect(page.locator("#catTitle")).toHaveText("Catálogo de calendarios 2027");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(MOBILE.width);
  });
});
