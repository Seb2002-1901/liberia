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
import { REGIONS, type RegionId } from "@/lib/locale/regions";

export function LocaleForm({
  initialCountry,
}: {
  initialCountry: string;
}) {
  const fallback: RegionId =
    (REGIONS.find((r) => r.id === initialCountry)?.id as RegionId | undefined) ??
    "CH";
  const [selected, setSelected] = React.useState<RegionId>(fallback);
  const [pending, startTransition] = React.useTransition();

  const region = REGIONS.find((r) => r.id === selected) ?? REGIONS[0];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfileLocale({
        country: region.country,
        currency: region.currency,
        locale: region.locale,
      });
      if (res.ok) {
        toast.success("Préférences enregistrées.");
      } else {
        toast.error(res.error);
      }
    });
  };

  const changed = selected !== initialCountry;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="country">Pays</Label>
          <Select
            value={selected}
            onValueChange={(v) => setSelected(v as RegionId)}
          >
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.countryLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Devise</Label>
          <p className="rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm">
            {region.currency}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Langue</Label>
          <p className="rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm">
            {region.languageLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Tes montants personnels seront affichés dans la devise et le format
          choisis. L'abonnement LIBERIA reste facturé en CHF au lancement.
        </p>
        <Button type="submit" disabled={!changed || pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
