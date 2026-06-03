"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
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

const HORIZON_VALUES = [30, 60, 90] as const;

export function PlanGenerateButton({
  hasPlan,
  disabled,
  disabledReason,
}: PlanGenerateButtonProps) {
  const t = useTranslations("app.plan.generate");
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
      toast.success(hasPlan ? t("successRegen") : t("successNew"));
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
        {hasPlan ? t("regenerateCtaShort") : t("generateCta")}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="gold">
          <Sparkles className="h-4 w-4" />
          {hasPlan ? t("regenerateCta") : t("generateCta")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasPlan ? t("dialogTitleRegen") : t("dialogTitleNew")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
            {hasPlan && t("archiveNotice")}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={String(horizon)}
          onValueChange={(v) => setHorizon(Number(v) as 30 | 60 | 90)}
          className="space-y-2"
        >
          {HORIZON_VALUES.map((value) => (
            <label
              key={value}
              htmlFor={`h-${value}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                horizon === value
                  ? "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.05)]"
                  : "border-border/60 hover:bg-card/60",
              )}
            >
              <RadioGroupItem
                id={`h-${value}`}
                value={String(value)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor={`h-${value}`} className="text-sm font-medium">
                  {t(`horizons.${value}.label`)}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t(`horizons.${value}.description`)}
                </p>
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
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>

        <p className="text-[11px] text-muted-foreground">{t("footnote")}</p>
      </DialogContent>
    </Dialog>
  );
}
