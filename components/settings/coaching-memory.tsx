"use client";

import * as React from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COACHING_TONES,
  RECURRING_CHALLENGES,
  SPENDING_TRIGGERS,
  type CoachingToneId,
  type RecurringChallengeId,
  type SpendingTriggerId,
} from "@/lib/constants";
import { clearMyMemory, updateMemory } from "@/app/actions/memory";
import { cn } from "@/lib/utils";

interface CoachingMemoryCardProps {
  initialTone: CoachingToneId | null;
  initialChallenges: RecurringChallengeId[];
  initialTriggers: SpendingTriggerId[];
  initialNotes: string | null;
}

export function CoachingMemoryCard({
  initialTone,
  initialChallenges,
  initialTriggers,
  initialNotes,
}: CoachingMemoryCardProps) {
  const t = useTranslations("app.settings.memory");
  const tConst = useTranslations("app.memoryConstants");
  const [tone, setTone] = React.useState<CoachingToneId | null>(initialTone);
  const [challenges, setChallenges] =
    React.useState<RecurringChallengeId[]>(initialChallenges);
  const [triggers, setTriggers] =
    React.useState<SpendingTriggerId[]>(initialTriggers);
  const [notes, setNotes] = React.useState<string>(initialNotes ?? "");
  const [pending, setPending] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  const dirty =
    tone !== initialTone ||
    arraysDiffer(challenges, initialChallenges) ||
    arraysDiffer(triggers, initialTriggers) ||
    notes.trim() !== (initialNotes ?? "");

  const toggle = <T extends string>(arr: T[], id: T): T[] =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const save = async () => {
    setPending(true);
    try {
      const res = await updateMemory({
        coachingTone: tone,
        recurringChallenges: challenges,
        spendingTriggers: triggers,
        progressNotes: notes.trim().length > 0 ? notes.trim() : null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("savedTitle"));
    } finally {
      setPending(false);
    }
  };

  const reset = async () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(t("resetConfirm"));
      if (!ok) return;
    }
    setClearing(true);
    try {
      const res = await clearMyMemory();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTone(null);
      setChallenges([]);
      setTriggers([]);
      setNotes("");
      toast.success(t("resetDone"));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="rounded-xl border border-[hsl(var(--gold)/0.25)] bg-[hsl(var(--gold)/0.04)] px-4 py-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{t("intro")}</p>
        <p className="mt-1">{t("introSub")}</p>
      </div>

      {/* Coaching tone */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">{t("toneLabel")}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("toneHelp")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {COACHING_TONES.map((tn) => {
            const active = tone === tn.id;
            return (
              <button
                key={tn.id}
                type="button"
                onClick={() => setTone(active ? null : tn.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-2xl border p-3.5 text-left transition-colors",
                  active
                    ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.06)]"
                    : "border-border/60 hover:border-border hover:bg-card/60",
                )}
              >
                <p className="text-sm font-medium">{tConst(`tones.${tn.id}.label`)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tConst(`tones.${tn.id}.description`)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurring challenges */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">{t("challengesLabel")}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("challengesHelp")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RECURRING_CHALLENGES.map((c) => {
            const active = challenges.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setChallenges((prev) => toggle(prev, c.id as RecurringChallengeId))
                }
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.1)] text-foreground"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tConst(`challenges.${c.id}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spending triggers */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">{t("triggersLabel")}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("triggersHelp")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SPENDING_TRIGGERS.map((tr) => {
            const active = triggers.includes(tr.id);
            return (
              <button
                key={tr.id}
                type="button"
                onClick={() =>
                  setTriggers((prev) => toggle(prev, tr.id as SpendingTriggerId))
                }
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.1)] text-foreground"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tConst(`triggers.${tr.id}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress notes */}
      <div className="space-y-2">
        <div>
          <Label htmlFor="memory-notes" className="text-sm font-medium">
            {t("notesLabel")}
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("notesHelp")}</p>
        </div>
        <Textarea
          id="memory-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
          rows={4}
          placeholder={t("notesPlaceholder")}
          className="resize-none"
        />
        <p className="text-[10px] text-muted-foreground">
          {t("charCount", { count: notes.length })}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={clearing || pending}
          className="text-muted-foreground hover:text-foreground"
        >
          {clearing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          {t("reset")}
        </Button>
        <Button
          variant="gold"
          size="sm"
          onClick={save}
          disabled={!dirty || pending || clearing}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

function arraysDiffer<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return true;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.some((v, i) => v !== bSorted[i]);
}
