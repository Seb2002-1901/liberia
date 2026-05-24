"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { generateFinancialPlan } from "@/app/actions/plans";

interface PlanGenerateButtonProps {
  hasPlan: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const HORIZONS = [
  { value: 30, label: "30 jours", description: "Sprint court : un objectif clair et mesurable." },
  { value: 60, label: "60 jours", description: "Deux mois pour installer durablement de nouvelles habitudes." },
  { value: 90, label: "90 jours", description: "Trimestre complet — la transformation la plus solide." },
] as const;

export function PlanGenerateButton({
  hasPlan,
  disabled,
  disabledReason,
}: PlanGenerateButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [horizon, setHorizon] = React.useState<30 | 60 | 90>(90);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await generateFinancialPlan({ horizonDays: horizon });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(hasPlan ? "Nouveau plan généré." : "Ton plan est prêt.");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (disabled) {
    return (
      <Button variant="outline" disabled title={disabledReason}>
        <Sparkles className="h-4 w-4" />
        {hasPlan ? "Régénérer" : "Générer mon plan"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="gold">
          <Sparkles className="h-4 w-4" />
          {hasPlan ? "Régénérer le plan" : "Générer mon plan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasPlan ? "Régénérer ton plan" : "Générer ton plan financier"}
          </DialogTitle>
          <DialogDescription>
            Le coach LIBERIA s'appuie sur tes vrais chiffres (revenus, dépenses,
            objectifs) pour construire un plan d'actions concrètes.
            {hasPlan && " Le plan actuel sera archivé."}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={String(horizon)}
          onValueChange={(v) => setHorizon(Number(v) as 30 | 60 | 90)}
          className="space-y-2"
        >
          {HORIZONS.map((h) => (
            <label
              key={h.value}
              htmlFor={`h-${h.value}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                horizon === h.value
                  ? "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.05)]"
                  : "border-border/60 hover:bg-card/60",
              )}
            >
              <RadioGroupItem
                id={`h-${h.value}`}
                value={String(h.value)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor={`h-${h.value}`} className="text-sm font-medium">
                  {h.label}
                </Label>
                <p className="text-xs text-muted-foreground">{h.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Génération…" : "Lancer la génération"}
          </Button>
        </DialogFooter>

        <p className="text-[11px] text-muted-foreground">
          La génération prend généralement 10 à 30 secondes. Tu peux fermer cette fenêtre — le plan apparaîtra dès qu'il sera prêt.
        </p>
      </DialogContent>
    </Dialog>
  );
}
