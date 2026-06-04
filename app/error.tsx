"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common.errorPages.global");

  useEffect(() => {
    console.error("[LIBERIA] runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container py-6">
        <BrandMark />
      </div>
      <div className="container my-auto flex flex-col items-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--destructive))]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">{t("body")}</p>
        <div className="mt-7 flex gap-3">
          <Button variant="gold" size="lg" onClick={() => reset()}>
            {t("retry")}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">{t("home")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
