import { test } from "@playwright/test";
import { join } from "node:path";

test("plan-v3 fresh screenshot 375x667", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/design-match/plan-v3", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: join(process.cwd(), "tests/e2e/plan-fresh-375.png"),
    fullPage: true,
  });
});
