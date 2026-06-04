"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Heart,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  archiveMemoryEntryAction,
  clearAllMemoryEntriesAction,
  setCoachMemoryEnabledAction,
} from "@/app/actions/memory-entries";
import { cn } from "@/lib/utils";
import type {
  MemoryEntryKind,
  UserMemoryEntry,
} from "@/types/database";

interface MemoryEntriesPanelProps {
  entries: readonly UserMemoryEntry[];
  enabled: boolean;
}

const KIND_ORDER: readonly MemoryEntryKind[] = [
  "goal",
  "preference",
  "event",
  "blocker",
];

const KIND_ICON: Record<MemoryEntryKind, React.ComponentType<{ className?: string }>> = {
  goal: Flag,
  preference: Heart,
  event: CheckCircle2,
  blocker: AlertTriangle,
};

export function MemoryEntriesPanel({
  entries: initialEntries,
  enabled: initialEnabled,
}: MemoryEntriesPanelProps) {
  const t = useTranslations("app.settings.memoryPage");
  const tKinds = useTranslations("app.settings.memoryPage.kinds");
  const formatter = useFormatter();

  const [entries, setEntries] =
    React.useState<readonly UserMemoryEntry[]>(initialEntries);
  const [enabled, setEnabled] = React.useState<boolean>(initialEnabled);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [togglePending, setTogglePending] = React.useState(false);
  const [clearPending, setClearPending] = React.useState(false);

  const grouped = React.useMemo(() => {
    const map = new Map<MemoryEntryKind, UserMemoryEntry[]>();
    for (const k of KIND_ORDER) map.set(k, []);
    for (const e of entries) {
      const bucket = map.get(e.kind);
      if (bucket) bucket.push(e);
    }
    return map;
  }, [entries]);

  const onArchive = async (id: string) => {
    setPendingId(id);
    const res = await archiveMemoryEntryAction(id);
    setPendingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success(t("toastArchived"));
  };

  const onToggle = async (next: boolean) => {
    setTogglePending(true);
    const prev = enabled;
    setEnabled(next); // optimistic
    const res = await setCoachMemoryEnabledAction(next);
    setTogglePending(false);
    if (!res.ok) {
      setEnabled(prev);
      toast.error(res.error);
      return;
    }
    toast.success(next ? t("toastEnabled") : t("toastDisabled"));
  };

  const onClearAll = async () => {
    if (!window.confirm(t("clearAllConfirm"))) return;
    setClearPending(true);
    const res = await clearAllMemoryEntriesAction();
    setClearPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setEntries([]);
    toast.success(t("toastCleared"));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("toggleTitle")}</CardTitle>
          <CardDescription>{t("toggleDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="coach-memory-toggle" className="text-sm">
                {enabled ? t("toggleOn") : t("toggleOff")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {enabled ? t("toggleOnHelp") : t("toggleOffHelp")}
              </p>
            </div>
            <Switch
              id="coach-memory-toggle"
              checked={enabled}
              disabled={togglePending}
              onCheckedChange={(v) => void onToggle(v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4 text-base">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--gold))]" />
              {t("entriesTitle", { count: entries.length })}
            </span>
            {entries.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={clearPending}
                onClick={() => void onClearAll()}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {clearPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t("clearAll")}
              </Button>
            )}
          </CardTitle>
          <CardDescription>{t("entriesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {entries.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            KIND_ORDER.map((kind) => {
              const list = grouped.get(kind) ?? [];
              if (list.length === 0) return null;
              const Icon = KIND_ICON[kind];
              return (
                <section key={kind} className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {tKinds(kind)} ({list.length})
                  </h3>
                  <ul className="space-y-2">
                    {list.map((entry) => (
                      <li
                        key={entry.id}
                        className={cn(
                          "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-sm transition-colors",
                          pendingId === entry.id && "opacity-50",
                        )}
                      >
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="font-medium text-foreground">
                            {entry.summary}
                          </p>
                          {entry.detail && (
                            <p className="text-xs text-muted-foreground">
                              {entry.detail}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground">
                            {t("entryMeta", {
                              importance: entry.importance,
                              date: formatter.dateTime(
                                new Date(entry.updated_at),
                                { dateStyle: "medium" },
                              ),
                            })}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={t("archiveEntryLabel")}
                          disabled={pendingId === entry.id}
                          onClick={() => void onArchive(entry.id)}
                          className="opacity-60 hover:opacity-100"
                        >
                          {pendingId === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/50 bg-card/20 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
