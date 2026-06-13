# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-multi.spec.ts >> 320px /demo
- Location: tests/e2e/mobile-multi.spec.ts:30:9

# Error details

```
Error: /demo @ 320px

expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Object {
-   "count": 0,
-   "maxOverflow": 0,
+   "count": 20,
+   "maxOverflow": 30,
  }
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "LIBERIA, page d'accueil" [ref=e7] [cursor=pointer]:
          - /url: /
          - generic [ref=e8]:
            - img [ref=e10]
            - generic [ref=e12]: LIBERIA
        - generic [ref=e13]:
          - button "Notifications (coming soon)" [disabled] [ref=e14]:
            - img [ref=e15]
          - button "Account menu" [ref=e18] [cursor=pointer]:
            - generic [ref=e20]: DM
    - main [ref=e21]:
      - generic [ref=e23]:
        - generic [ref=e24]:
          - paragraph [ref=e25]: You're exploring LIBERIA in demo mode.
          - paragraph [ref=e26]: The data shown is fictional. Create your account to pilot your real data (14-day free trial).
          - generic [ref=e27]:
            - link "Create my account" [ref=e28] [cursor=pointer]:
              - /url: /register
            - link "Sign in" [ref=e29] [cursor=pointer]:
              - /url: /login
        - generic [ref=e30]:
          - generic [ref=e31]:
            - paragraph [ref=e32]: Overview
            - heading "Demo dashboard" [level=1] [ref=e33]
            - paragraph [ref=e34]: A representative view of someone rebuilding their finances.
          - generic [ref=e36]:
            - img [ref=e37]
            - text: Demo
        - generic [ref=e39]:
          - generic [ref=e41]:
            - generic [ref=e45]: "35"
            - generic [ref=e46]:
              - paragraph [ref=e47]: Financial stability
              - generic [ref=e48]:
                - generic [ref=e49]: "35"
                - generic [ref=e50]: / 100
              - paragraph [ref=e51]: Fragile
              - paragraph [ref=e52]: Focus on the essential expenses.
          - generic [ref=e53]:
            - generic [ref=e54]:
              - paragraph [ref=e55]: Financial stress
              - img [ref=e57]
            - paragraph [ref=e60]: 71/100
            - paragraph [ref=e61]: High mental load.
        - generic [ref=e62]:
          - generic [ref=e63]:
            - generic [ref=e64]:
              - paragraph [ref=e65]: Monthly income
              - img [ref=e67]
            - paragraph [ref=e70]: 2 450 CHF
          - generic [ref=e71]:
            - generic [ref=e72]:
              - paragraph [ref=e73]: Net cash flow
              - img [ref=e75]
            - paragraph [ref=e78]: 270 CHF
            - paragraph [ref=e79]: Savings rate 11%
          - generic [ref=e80]:
            - generic [ref=e81]:
              - paragraph [ref=e82]: Emergency fund
              - img [ref=e84]
            - paragraph [ref=e87]: 0.6 months
            - paragraph [ref=e88]: 1 200 CHF
        - generic [ref=e89]:
          - generic [ref=e90]:
            - generic [ref=e91]:
              - paragraph [ref=e92]: Fixed expenses
              - img [ref=e94]
            - paragraph [ref=e97]: 2 180 CHF
            - paragraph [ref=e98]: Recurring, normalised per month
          - generic [ref=e99]:
            - generic [ref=e100]:
              - paragraph [ref=e101]: Variable expenses
              - img [ref=e103]
            - paragraph [ref=e107]: 0 CHF
            - paragraph [ref=e108]: One-off transactions this month
          - generic [ref=e109]:
            - generic [ref=e110]:
              - paragraph [ref=e111]: Total expenses
              - img [ref=e113]
            - paragraph [ref=e117]: 2 180 CHF
            - paragraph [ref=e118]: Fixed + variable this month
          - generic [ref=e119]:
            - generic [ref=e120]:
              - paragraph [ref=e121]: Transactions
              - img [ref=e123]
            - paragraph [ref=e126]: "0"
            - paragraph [ref=e127]: Number of one-off expenses this month
        - generic [ref=e128]:
          - generic [ref=e131]:
            - generic [ref=e132]: Monthly flow
            - generic [ref=e133]: Smoothed preview
          - generic [ref=e137]:
            - generic [ref=e139]: Recommendations
            - generic [ref=e140]:
              - paragraph [ref=e143]:
                - generic [ref=e144]: Short term.
                - text: Aim for 1 month of expenses in your emergency fund within 6 months.
              - paragraph [ref=e147]:
                - generic [ref=e148]: Lighten up.
                - text: Cut 1 non-essential subscription this month.
              - paragraph [ref=e151]:
                - generic [ref=e152]: Automation.
                - text: Set up a recurring monthly transfer to savings, even a symbolic one.
        - generic [ref=e153]:
          - generic [ref=e156]: Expense breakdown
          - generic [ref=e160]:
            - generic [ref=e161]:
              - generic [ref=e162]: Active goals
              - link "All" [ref=e163] [cursor=pointer]:
                - /url: /goals
                - text: All
                - img
            - generic [ref=e164]:
              - generic [ref=e165]:
                - generic [ref=e166]:
                  - generic [ref=e167]:
                    - paragraph [ref=e168]: Emergency fund (1 month)
                    - paragraph [ref=e169]: Emergency fund
                  - paragraph [ref=e170]: 1 200 CHF / 2 200 CHF
                - progressbar [ref=e171]
              - generic [ref=e173]:
                - generic [ref=e174]:
                  - generic [ref=e175]:
                    - paragraph [ref=e176]: Pay off consumer loan
                    - paragraph [ref=e177]: Pay off debt
                  - paragraph [ref=e178]: 480 CHF / 1 800 CHF
                - progressbar [ref=e179]
    - navigation [ref=e181]:
      - generic [ref=e182]:
        - paragraph [ref=e183]: Demo mode · read-only
        - link "Create my account" [ref=e184] [cursor=pointer]:
          - /url: /register
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const ROUTES = [
  4  |   "/", "/demo",
  5  |   "/design-match/dashboard-v3",
  6  |   "/design-match/coach-v3",
  7  |   "/design-match/mon-analyse-v3",
  8  |   "/design-match/plan-v3",
  9  |   "/design-match/revenus-v3",
  10 |   "/design-match/depenses-v3",
  11 |   "/design-match/budget-v3",
  12 |   "/design-match/objectifs-v3",
  13 |   "/design-match/epargne-v3",
  14 |   "/design-match/opportunites-v3",
  15 |   "/design-match/investissements-v3",
  16 |   "/design-match/profil-v3",
  17 |   "/design-match/parametres-v3",
  18 |   "/settings/subscription",
  19 | ];
  20 | 
  21 | const SIZES = [
  22 |   { name: "320", width: 320, height: 568 },
  23 |   { name: "375", width: 375, height: 667 },
  24 |   { name: "390", width: 390, height: 844 },
  25 |   { name: "430", width: 430, height: 932 },
  26 | ];
  27 | 
  28 | for (const sz of SIZES) {
  29 |   for (const route of ROUTES) {
  30 |     test(`${sz.name}px ${route}`, async ({ page }) => {
  31 |       await page.setViewportSize({ width: sz.width, height: sz.height });
  32 |       await page.goto(route, { waitUntil: "domcontentloaded", timeout: 15000 });
  33 |       await page.waitForTimeout(500);
  34 | 
  35 |       const overflows = await page.evaluate((vw: number) => {
  36 |         const all = document.querySelectorAll("*");
  37 |         let count = 0;
  38 |         let maxOverflow = 0;
  39 |         for (const el of all) {
  40 |           const rect = el.getBoundingClientRect();
  41 |           if (rect.right > vw + 1 && rect.width > 0 && rect.height > 0) {
  42 |             const cs = window.getComputedStyle(el);
  43 |             if (cs.position === "fixed" || cs.position === "absolute") continue;
  44 |             count++;
  45 |             maxOverflow = Math.max(maxOverflow, rect.right - vw);
  46 |           }
  47 |         }
  48 |         return { count, maxOverflow: Math.round(maxOverflow) };
  49 |       }, sz.width);
  50 | 
  51 |       console.log(`${sz.name}px ${route}: ${overflows.count} overflows, max=${overflows.maxOverflow}px`);
  52 | 
  53 |       // Tolérer 5 px de fluctuation (rounding) sur ≤ 3 éléments
  54 |       if (overflows.count > 5 || overflows.maxOverflow > 50) {
> 55 |         expect.soft(overflows, `${route} @ ${sz.name}px`).toEqual({
     |                                                           ^ Error: /demo @ 320px
  56 |           count: 0,
  57 |           maxOverflow: 0,
  58 |         });
  59 |       }
  60 |     });
  61 |   }
  62 | }
  63 | 
```