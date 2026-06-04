"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Defensive normalisation: radix-ui Select treats `value` as a string
// identity. If it doesn't match any SelectItem, the trigger renders
// blank and (with React 19 + radix-select 2.2) the next render after a
// state change inside the Portal can throw on the next interaction.
// Pin every controlled value to a known catalog entry up-front so the
// trigger and the items always agree.
function safeCountry(value: string): string {
  return isCountryId(value) ? value : "CH";
}
function safeCurrency(value: string): string {
  return isCurrencyId(value) ? value : "CHF";
}
function safeLanguage(value: string): string {
  return isLanguageId(value) ? value : "fr-CH";
}

export function LocaleForm({
  initialCountry,
  initialCurrency,
  initialLocale,
}: Props) {
  const t = useTranslations("app.profile.locale");
  const [country, setCountry] = React.useState(() => safeCountry(initialCountry));
  const [currency, setCurrency] = React.useState(() =>
    safeCurrency(initialCurrency),
  );
  const [language, setLanguage] = React.useState(() =>
    safeLanguage(initialLocale),
  );
  const [pending, startTransition] = React.useTransition();

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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="country">{t("country")}</Label>
          <Select value={country} onValueChange={onCountryChange}>
            <SelectTrigger id="country">
              <SelectValue placeholder={t("country")} />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currency">{t("currency")}</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue placeholder={t("currency")} />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="language">{t("language")}</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue placeholder={t("language")} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("footnote")}</p>
        <Button type="submit" disabled={!changed || pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
