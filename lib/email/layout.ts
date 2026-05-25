/**
 * Shared HTML layout primitives for all LIBERIA emails. Plain strings,
 * inline styles — no React-Email dep — so they render consistently in
 * Gmail, Apple Mail, Outlook Web. Keep brand colors here in one place
 * so future template tweaks stay coherent.
 */

export const EMAIL_THEME = {
  BRAND_GOLD: "#c9a96e",
  BG: "#0a0a0c",
  CARD: "#15151a",
  FG: "#f1ede4",
  MUTED: "#9999a3",
  DANGER: "#ef6464",
  SUCCESS: "#7dd3a0",
  BORDER: "#2a2a32",
} as const;

export type EmailRender = {
  subject: string;
  html: string;
  text: string;
};

/**
 * HTML-entity escape every interpolated string that came from a user
 * (full names, custom titles, currency strings, URLs, …). Templates
 * MUST pass user input through this — never interpolate raw.
 */
export function escape(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a complete email wrapped in the LIBERIA premium scaffold.
 * `eyebrow` shows above the logo (e.g. "Récap de la semaine"); `inner`
 * is the body HTML (you compose it with the card helpers below);
 * `appUrl` + `unsubscribeUrl` populate the footer.
 */
export function renderLayout(opts: {
  subject: string;
  eyebrow: string;
  inner: string;
  appUrl: string;
  unsubscribeUrl?: string;
  /**
   * Footer disclaimer line. Override per-template when needed (e.g.
   * payment emails: "Tu reçois cet email car ton abonnement requiert
   * ton attention"). Default mentions weekly recap opt-in.
   */
  footerDisclaimer?: string;
}): string {
  const t = EMAIL_THEME;
  const disclaimer =
    opts.footerDisclaimer ??
    `Tu reçois cet email parce qu'il concerne ton compte LIBERIA. Tu peux ajuster tes préférences depuis <a href="${escape(opts.appUrl)}/settings" style="color:${t.MUTED};">tes paramètres</a>.`;
  const unsubLine = opts.unsubscribeUrl
    ? `<br><a href="${escape(opts.unsubscribeUrl)}" style="color:${t.MUTED};">Se désinscrire des emails non essentiels</a>`
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${t.BG};color:${t.FG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${t.BG};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 16px;">
          <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:${t.BRAND_GOLD};margin:0 0 8px 0;letter-spacing:0.04em;">LIBERIA</h1>
          <p style="color:${t.MUTED};font-size:12px;margin:0 0 24px 0;text-transform:uppercase;letter-spacing:0.18em;">${escape(opts.eyebrow)}</p>
          ${opts.inner}
          <p style="color:${t.MUTED};font-size:11px;line-height:1.6;text-align:center;margin:24px 0 0 0;">
            LIBERIA est un outil de pilotage personnel. Aucune information ici n'est un conseil financier réglementé.<br>
            ${disclaimer}${unsubLine}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** A standalone "hero" card: salutation + intro paragraph. */
export function heroCard(opts: {
  greeting: string;
  body: string;
}): string {
  const t = EMAIL_THEME;
  return `<div style="background:${t.CARD};border:1px solid ${t.BORDER};border-radius:16px;padding:24px;margin-bottom:16px;">
  <p style="font-size:16px;margin:0 0 8px 0;">${escape(opts.greeting)}</p>
  <p style="color:${t.MUTED};font-size:14px;line-height:1.55;margin:0;">${opts.body}</p>
</div>`;
}

/** A 2-column metric grid. Pass 2 or 4 cells; the table tiles itself. */
export function metricsTable(
  cells: Array<{ label: string; value: string; tone?: "neutral" | "danger" | "success" }>,
): string {
  const t = EMAIL_THEME;
  const cellHtml = (cell: (typeof cells)[number]): string => {
    const color =
      cell.tone === "danger" ? t.DANGER : cell.tone === "success" ? t.SUCCESS : t.FG;
    return `<div style="background:${t.CARD};border:1px solid ${t.BORDER};border-radius:12px;padding:14px;">
      <p style="color:${t.MUTED};font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px 0;">${escape(cell.label)}</p>
      <p style="font-size:18px;font-weight:600;color:${color};margin:0;">${escape(cell.value)}</p>
    </div>`;
  };
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const left = cells[i];
    const right = cells[i + 1];
    rows.push(
      `<tr>
        <td width="50%" style="padding-right:8px;vertical-align:top;">${cellHtml(left)}</td>
        ${right ? `<td width="50%" style="padding-left:8px;vertical-align:top;">${cellHtml(right)}</td>` : "<td></td>"}
      </tr>`,
    );
    if (i + 2 < cells.length) rows.push(`<tr><td colspan="2" style="height:8px;"></td></tr>`);
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">${rows.join("")}</table>`;
}

/** A subdued highlight card with an eyebrow + body. */
export function noticeCard(opts: {
  eyebrow: string;
  body: string;
  toneColor?: string;
}): string {
  const t = EMAIL_THEME;
  const color = opts.toneColor ?? t.BRAND_GOLD;
  return `<div style="background:${t.CARD};border:1px solid ${t.BORDER};border-radius:16px;padding:20px;margin-bottom:16px;">
    <p style="color:${color};font-size:11px;text-transform:uppercase;letter-spacing:0.18em;margin:0 0 8px 0;">${escape(opts.eyebrow)}</p>
    <p style="font-size:14px;line-height:1.55;color:${t.FG};margin:0;">${opts.body}</p>
  </div>`;
}

/** Gold filled CTA button. */
export function primaryButton(opts: { label: string; href: string }): string {
  const t = EMAIL_THEME;
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${escape(opts.href)}" style="display:inline-block;background:${t.BRAND_GOLD};color:${t.BG};padding:12px 24px;border-radius:12px;font-weight:600;text-decoration:none;font-size:14px;">${escape(opts.label)}</a>
  </div>`;
}

/** Subtle outline CTA. Use for secondary actions. */
export function secondaryButton(opts: { label: string; href: string }): string {
  const t = EMAIL_THEME;
  return `<div style="text-align:center;margin:16px 0;">
    <a href="${escape(opts.href)}" style="display:inline-block;border:1px solid ${t.BORDER};color:${t.FG};padding:10px 22px;border-radius:12px;font-weight:500;text-decoration:none;font-size:13px;">${escape(opts.label)}</a>
  </div>`;
}
