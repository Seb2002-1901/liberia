import { test, expect } from "@playwright/test";

/**
 * Sprint Iris — test de régression composer sticky.
 *
 * Bug historique : conversation longue → composer disparaît sous le
 * viewport. Root cause (corrigée commit suivant ce test) : un wrapper
 * `<div display:flex>` (sans flexDirection, donc flex row par défaut)
 * entre ChatColumn et CoachConversationV3Client. Le flex:1 racine du
 * client était interprété en croissance horizontale au lieu de
 * verticale → hauteur intrinsèque (contenu) → débordement grid cell.
 *
 * La fixture `/test/composer-layout` reproduit la structure EXACTE
 * de /coach/[id] (sidebar 280 + topbar 64 + main grid 1fr×2col +
 * ChatColumn flex column) avec 120 messages synthétiques. Pas de
 * Supabase ni Anthropic — accessible directement.
 *
 * Invariants vérifiés :
 *  1. Composer.boundingRect.bottom ≤ viewport.height
 *  2. Composer reste visible après scroll thread vers le HAUT
 *  3. Composer reste visible après scroll thread vers le BAS
 *  4. Le thread (overflow auto) scrolle indépendamment, pas la page
 *  5. Pas de scroll global sur <body> (overflow hidden parent)
 */

const PW_CHROME_PATH =
  process.env.PW_CHROME_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

test.use({
  launchOptions: { executablePath: PW_CHROME_PATH },
});

const FIXTURE = "/test/composer-layout";

test.describe("Composer sticky — desktop 1280×800", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("composer visible au chargement initial", async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');
    const composer = page.locator('[data-testid="cl-composer"]');
    const composerBox = await composer.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(800);
    expect(composerBox!.y).toBeGreaterThan(0);
  });

  test("composer reste visible après scroll thread vers le haut", async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');
    // Scroll le thread tout en haut
    await page.evaluate(() => {
      const thread = document.querySelector(
        '[data-testid="cl-thread"]',
      ) as HTMLElement;
      if (thread) thread.scrollTop = 0;
    });
    const composer = page.locator('[data-testid="cl-composer"]');
    const composerBox = await composer.boundingBox();
    expect(composerBox).not.toBeNull();
    // Composer toujours dans le viewport (Y + height ≤ 800)
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(800);
  });

  test("composer reste visible après scroll thread vers le bas", async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');
    // Scroll le thread tout en bas
    await page.evaluate(() => {
      const thread = document.querySelector(
        '[data-testid="cl-thread"]',
      ) as HTMLElement;
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
    const composer = page.locator('[data-testid="cl-composer"]');
    const composerBox = await composer.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(800);
  });

  test("thread a scroll interne, pas la page", async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-thread"]');
    // 1. Le thread doit avoir scrollHeight > clientHeight (= scrollable)
    const threadScrollable = await page.evaluate(() => {
      const t = document.querySelector(
        '[data-testid="cl-thread"]',
      ) as HTMLElement;
      return t ? t.scrollHeight > t.clientHeight : false;
    });
    expect(threadScrollable).toBe(true);
    // 2. Le body NE doit PAS avoir de scroll global
    const bodyScroll = await page.evaluate(() => {
      return {
        bodyScrollTop: document.body.scrollTop,
        bodyScrollHeight: document.body.scrollHeight,
        bodyClientHeight: document.body.clientHeight,
        windowInnerHeight: window.innerHeight,
      };
    });
    // bodyScrollHeight === bodyClientHeight (pas de scroll global)
    expect(bodyScroll.bodyScrollHeight).toBeLessThanOrEqual(
      bodyScroll.windowInnerHeight + 1,
    );
  });

  test("composer ET footer tous deux visibles ET ordonnés correctement", async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');
    const composer = page.locator('[data-testid="cl-composer"]');
    const footer = page.locator('[data-testid="cl-footer"]');
    const composerBox = await composer.boundingBox();
    const footerBox = await footer.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    // Composer au-dessus du footer
    expect(composerBox!.y).toBeLessThan(footerBox!.y);
    // Footer dans le viewport
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(800);
  });
});

test.describe("Composer sticky — mobile iPhone 12 (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("composer visible mobile au chargement", async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');
    const composer = page.locator('[data-testid="cl-composer"]');
    const composerBox = await composer.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);
    expect(composerBox!.x).toBeGreaterThanOrEqual(0);
    expect(composerBox!.x + composerBox!.width).toBeLessThanOrEqual(390);
  });

  test("composer reste visible après scroll thread mobile", async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');
    await page.evaluate(() => {
      const t = document.querySelector(
        '[data-testid="cl-thread"]',
      ) as HTMLElement;
      if (t) t.scrollTop = t.scrollHeight / 2;
    });
    const composer = page.locator('[data-testid="cl-composer"]');
    const composerBox = await composer.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);
  });

  test("textarea a fontSize 16+ (anti zoom iOS)", async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    const fontSize = await page.evaluate(() => {
      const ta = document.querySelector(
        '[data-testid="cl-textarea"]',
      ) as HTMLElement;
      return ta ? parseFloat(window.getComputedStyle(ta).fontSize) : 0;
    });
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });
});

test.describe("Composer sticky — petit écran 320×568 (iPhone SE)", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("composer reste visible sur petit viewport", async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');
    const composer = page.locator('[data-testid="cl-composer"]');
    const composerBox = await composer.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(568);
  });
});

/**
 * Lock layout — invariants stricts.
 * Inspiré ChatGPT/WhatsApp : SEUL le thread des messages bouge.
 * Tous les autres éléments doivent rester FIGÉS pixel près.
 */
test.describe("Lock layout — rien ne bouge sauf le thread", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("topbar + hero + composer + footer FIGÉS au scroll", async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');

    const captureRects = async () => {
      return await page.evaluate(() => {
        const get = (sel: string) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        return {
          topbar: get('[data-testid="cl-topbar"]'),
          hero: get('[data-testid="cl-hero"]'),
          composer: get('[data-testid="cl-composer"]'),
          footer: get('[data-testid="cl-footer"]'),
          rail: get('[data-testid="cl-rail"]'),
        };
      });
    };

    const before = await captureRects();
    // Scroll thread mid-way puis tout en bas puis tout en haut
    await page.evaluate(() => {
      const t = document.querySelector(
        '[data-testid="cl-thread"]',
      ) as HTMLElement;
      if (!t) return;
      t.scrollTop = t.scrollHeight / 2;
      t.scrollTop = t.scrollHeight;
      t.scrollTop = 0;
      t.scrollTop = t.scrollHeight / 3;
    });
    const after = await captureRects();

    // Pixel-perfect : chaque élément stable doit avoir EXACTEMENT
    // la même position avant/après le scroll thread.
    expect(after.topbar).toEqual(before.topbar);
    expect(after.hero).toEqual(before.hero);
    expect(after.composer).toEqual(before.composer);
    expect(after.footer).toEqual(before.footer);
    expect(after.rail).toEqual(before.rail);
  });

  test("page entière ne scrolle JAMAIS (body scrollTop = 0)", async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');

    // Simule des actions qui pourraient causer un scroll page (tab,
    // input focus, scroll via roue, etc.)
    await page.evaluate(() => {
      // Tente de scroller le window — devrait ne RIEN faire avec
      // overflow:hidden sur le parent.
      window.scrollTo(0, 9999);
    });
    await page.locator('[data-testid="cl-textarea"]').click();
    await page.keyboard.type("test message qui pourrait vouloir faire scroller");

    const scrollState = await page.evaluate(() => ({
      windowScrollY: window.scrollY,
      docScrollTop: document.documentElement.scrollTop,
      bodyScrollTop: document.body.scrollTop,
    }));
    expect(scrollState.windowScrollY).toBe(0);
    expect(scrollState.docScrollTop).toBe(0);
    expect(scrollState.bodyScrollTop).toBe(0);
  });

  test("textarea grow auto MAIS composer reste ancré en bas", async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');

    const composerBefore = await page
      .locator('[data-testid="cl-composer"]')
      .boundingBox();
    const composerBottom = composerBefore!.y + composerBefore!.height;

    // Type plusieurs lignes pour forcer textarea à grandir
    const textarea = page.locator('[data-testid="cl-textarea"]');
    await textarea.click();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.type(`Ligne ${i} de texte saisi par utilisateur`);
      await page.keyboard.press("Shift+Enter");
    }

    const composerAfter = await page
      .locator('[data-testid="cl-composer"]')
      .boundingBox();
    // Le composer GRANDIT vers le HAUT (sa y diminue) mais son
    // bottom reste sur le bord du viewport (sauf safe-area).
    const composerAfterBottom = composerAfter!.y + composerAfter!.height;
    // Tolérance 4px pour arrondis sub-pixel
    expect(Math.abs(composerAfterBottom - composerBottom)).toBeLessThanOrEqual(
      4,
    );
  });
});

/**
 * Stress test 120 messages → toujours fluide + composer fixe
 */
test.describe("Stress test — 120 messages", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("120 messages chargés, scroll fluide, composer fixe", async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="cl-composer"]');

    // Confirmer qu'on a bien 120 messages (60 user + 60 assistant)
    const userMessages = await page.locator("div").filter({
      hasText: /User message #/,
    }).count();
    const assistantMessages = await page.locator("div").filter({
      hasText: /Réponse Iris #/,
    }).count();
    // Tolérant : 60 ± 5 (dépendant des divs imbriqués comptés)
    expect(userMessages).toBeGreaterThanOrEqual(55);
    expect(assistantMessages).toBeGreaterThanOrEqual(55);

    // Scroll dur du thread — assert no exception + composer toujours en place
    const composer = page.locator('[data-testid="cl-composer"]');
    const initialBox = await composer.boundingBox();
    await page.evaluate(() => {
      const t = document.querySelector(
        '[data-testid="cl-thread"]',
      ) as HTMLElement;
      // 10 cycles de scroll hard
      for (let i = 0; i < 10; i++) {
        t.scrollTop = i * 500;
      }
    });
    const finalBox = await composer.boundingBox();
    expect(finalBox).toEqual(initialBox);
  });
});
