"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
} from "@/lib/locale/countries";
import { CURRENCIES } from "@/lib/locale/currencies";
import { LANGUAGES } from "@/lib/locale/languages";

type Props = {
  initialCountry: string;
  initialCurrency: string;
  initialLocale: string;
};

export function LocaleForm({
  initialCountry,
  initialCurrency,
  initialLocale,
}: Props) {
  const [country, setCountry] = React.useState(initialCountry);
  const [currency, setCurrency] = React.useState(initialCurrency);
  const [language, setLanguage] = React.useState(initialLocale);
  const [pending, startTransition] = React.useTransition();

  // Picking a country only *suggests* currency + language. Whatever
  // value the user currently has in those two selectors is overwritten
  // with the country's defaults, but they can then change either back
  // to anything — a Swiss user who wants the interface in Italian and
  // amounts in CHF is the explicit V1 target.
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
        toast.success("Préférences enregistrées.");
      } else {
        toast.error(res.error);
      }
    });
  };

  const changed =
    country !== initialCountry ||
    currency !== initialCurrency ||
    language !== initialLocale;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="country">Pays</Label>
          <Select value={country} onValueChange={onCountryChange}>
            <SelectTrigger id="country">
              <SelectValue />
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
          <Label htmlFor="currency">Devise</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
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
          <Label htmlFor="language">Langue</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue />
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
        <p className="text-xs text-muted-foreground">
          Tes montants personnels suivent ta devise. L&apos;interface reste en
          français au lancement ; le choix de langue prépare la traduction
          complète. L&apos;abonnement LIBERIA est facturé en CHF.
        </p>
        <Button type="submit" disabled={!changed || pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
