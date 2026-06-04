import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/layout/brand-mark";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, tCommon] = await Promise.all([
    getTranslations("auth.layout"),
    getTranslations("common"),
  ]);
  const tagline = tCommon("tagline");
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <BrandMark />
        <div className="my-auto flex w-full max-w-md flex-col py-12 lg:py-20">
          {children}
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} LIBERIA ·{" "}
          <Link href="/terms" className="hover:text-foreground">
            {t("footerTerms")}
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:text-foreground">
            {t("footerPrivacy")}
          </Link>
        </p>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden bg-[hsl(var(--secondary))] lg:block">
        <div
          className="absolute inset-0 grid-bg opacity-50"
          aria-hidden
        />
        <div
          className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[hsl(var(--gold)/0.12)] blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-[hsl(var(--gold-muted)/0.10)] blur-3xl"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between p-16">
          <div />
          <div className="max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
              {tagline}
            </p>
            <p className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight">
              {t("panelTitle")}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{t("panelBody")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
