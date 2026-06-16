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
