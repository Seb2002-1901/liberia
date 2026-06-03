import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/layout/brand-mark";
import { ROUTES } from "@/lib/constants";

export async function SiteFooter() {
  const t = await getTranslations("marketing.footer");

  const columns = [
    {
      title: t("columns.product"),
      links: [
        { label: t("links.features"), href: "/#features" },
        { label: t("links.pricing"), href: ROUTES.pricing },
        { label: t("links.demo"), href: ROUTES.demo },
      ],
    },
    {
      title: t("columns.resources"),
      links: [
        { label: t("links.faq"), href: "/#faq" },
        { label: t("links.security"), href: ROUTES.security },
        { label: t("links.aiPolicy"), href: ROUTES.aiPolicy },
      ],
    },
    {
      title: t("columns.legal"),
      links: [
        { label: t("links.privacy"), href: ROUTES.privacy },
        { label: t("links.terms"), href: ROUTES.terms },
        { label: t("links.disclaimer"), href: ROUTES.legal },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/60 bg-background/40">
      <div className="container py-16">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-4">
            <BrandMark />
            <p className="max-w-xs text-sm text-muted-foreground">
              {t("tagline")}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-semibold text-foreground">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p className="max-w-xl">{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
