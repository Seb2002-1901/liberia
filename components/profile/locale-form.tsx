"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  V3InlineButton,
  V3Label,
  V3Select,
  V3_TOKENS as C,
} from "@/components/ui/v3-atoms";
import { updateProfileLocale } from "@/app/actions/profile";
import {
  COUNTRIES,
  getDefaultCurrencyForCountry,
  getDefaultLanguageForCountry,
  isCountryId,
} from "@/lib/locale/countries";
import { CURRENCIES, isCurrencyId } from "@/lib/locale/currencies";
import { LANGUAGES, isLanguageId } from "@/lib/locale/languages";

type Props = {
  initialCountry: string;
  initialCurrency: string;
  initialLocale: string;
};

function safeCountry(value: string): string {
  return isCountryId(value) ? value : "CH";
}
function safeCurrency(value: string): string {
  return isCurrencyId(value) ? value : "CHF";
}
function safeLanguage(value: string): string {
  return isLanguageId(value) ? value : "fr-CH";
}

/**
 * Refonte V3 — Phase Hardening.
 * Plus aucune dépendance shadcn. V3Select + V3InlineButton.
 * Logique updateProfileLocale inchangée.
 */
export function LocaleForm({
  initialCountry,
  initialCurrency,
  initialLocale,
}: Props) {
  const t = useTranslations("app.profile.locale");
  const router = useRouter();
  const [country, setCountry] = React.useState(() => safeCountry(initialCountry));
  const [currency, setCurrency] = React.useState(() =>
    safeCurrency(initialCurrency),
  );
  const [language, setLanguage] = React.useState(() =>
    safeLanguage(initialLocale),
  );
  const [pending, startTransition] = React.useTransition();
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  const onCountryChange = (next: string) => {
    setCountry(next);
    setCurrency(getDefaultCurrencyForCountry(next));
    setLanguage(getDefaultLanguageForCountry(next));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfileLocale({
        country,
        currency,
        locale: language,
      });
      if (res.ok) {
        toast.success(t("saved"));
        setSavedAt(Date.now());
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const changed =
    country !== safeCountry(initialCountry) ||
    currency !== safeCurrency(initialCurrency) ||
    language !== safeLanguage(initialLocale);

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <V3Label htmlFor="country">{t("country")}</V3Label>
          <V3Select
            id="country"
            value={country}
            onChange={onCountryChange}
            options={COUNTRIES.map((c) => ({ value: c.id, label: c.label }))}
            placeholder={t("country")}
            ariaLabel={t("country")}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <V3Label htmlFor="currency">{t("currency")}</V3Label>
          <V3Select
            id="currency"
            value={currency}
            onChange={setCurrency}
            options={CURRENCIES.map((c) => ({ value: c.id, label: c.label }))}
            placeholder={t("currency")}
            ariaLabel={t("currency")}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <V3Label htmlFor="language">{t("language")}</V3Label>
          <V3Select
            id="language"
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))}
            placeholder={t("language")}
            ariaLabel={t("language")}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p style={{ margin: 0, fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, maxWidth: 460 }}>
          {t("footnote")}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {savedAt !== null && !changed && (
            <SavedBadge timestamp={savedAt} />
          )}
          <V3InlineButton type="submit" disabled={!changed} loading={pending}>
            {t("save")}
          </V3InlineButton>
        </div>
      </div>
    </form>
  );
}

function SavedBadge({ timestamp }: { timestamp: number }) {
  const [secondsAgo, setSecondsAgo] = React.useState(0);
  React.useEffect(() => {
    const tick = () =>
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - timestamp) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timestamp]);
  const label =
    secondsAgo < 5
      ? "à l'instant"
      : secondsAgo < 60
        ? `il y a ${secondsAgo}s`
        : `il y a ${Math.floor(secondsAgo / 60)} min`;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        backgroundColor: C.successBg,
        color: C.success,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 999,
      }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Sauvegardé {label}
    </span>
  );
}
