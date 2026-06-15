"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Heart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  V3Switch,
  V3InlineButton,
  V3_TOKENS as C,
} from "@/components/ui/v3-atoms";
import {
  archiveMemoryEntryAction,
  clearAllMemoryEntriesAction,
  setCoachMemoryEnabledAction,
} from "@/app/actions/memory-entries";
import type {
  MemoryEntryKind,
  UserMemoryEntry,
} from "@/types/database";

/**
 * Refonte V3 — Phase Hardening.
 * Zéro dépendance shadcn. V3Switch + V3InlineButton + style inline navy.
 */

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

const KIND_ICON: Record<MemoryEntryKind, React.ComponentType<{ width?: number; height?: number }>> = {
  goal: Flag,
  preference: Heart,
  event: CheckCircle2,
  blocker: AlertTriangle,
};

const SHADOW_CARD =
  "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)";

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
    setEnabled(next);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toggle activation */}
      <section
        style={{
          padding: "20px 22px",
          backgroundColor: C.cardBg,
          borderRadius: 14,
          boxShadow: SHADOW_CARD,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: C.textDark,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.01em",
          }}
        >
          {t("toggleTitle")}
        </h2>
        <p
          style={{
            margin: "4px 0 14px 0",
            fontSize: 12.5,
            color: C.textMuted,
            lineHeight: 1.5,
          }}
        >
          {t("toggleDescription")}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: "12px 14px",
            backgroundColor: C.pageBg,
            borderRadius: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                fontWeight: 600,
                color: C.textDark,
              }}
            >
              {enabled ? t("toggleOn") : t("toggleOff")}
            </p>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: 12,
                color: C.textMuted,
                lineHeight: 1.5,
              }}
            >
              {enabled ? t("toggleOnHelp") : t("toggleOffHelp")}
            </p>
          </div>
          <V3Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={togglePending}
            ariaLabel={t("toggleTitle")}
          />
        </div>
      </section>

      {/* Liste des entrées */}
      <section
        style={{
          padding: "20px 22px",
          backgroundColor: C.cardBg,
          borderRadius: 14,
          boxShadow: SHADOW_CARD,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 4,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: C.textDark,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Sparkles width={15} height={15} style={{ color: C.primary }} />
            {t("entriesTitle", { count: entries.length })}
          </h2>
          {entries.length > 0 && (
            <V3InlineButton
              variant="danger"
              onClick={onClearAll}
              loading={clearPending}
            >
              <Trash2 width={13} height={13} />
              {t("clearAll")}
            </V3InlineButton>
          )}
        </div>
        <p
          style={{
            margin: "4px 0 18px 0",
            fontSize: 12.5,
            color: C.textMuted,
            lineHeight: 1.5,
          }}
        >
          {t("entriesDescription")}
        </p>

        {entries.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {KIND_ORDER.map((kind) => {
              const list = grouped.get(kind) ?? [];
              if (list.length === 0) return null;
              const Icon = KIND_ICON[kind];
              return (
                <div key={kind} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3
                    style={{
                      margin: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: C.textMuted,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    <Icon width={13} height={13} />
                    {tKinds(kind)} ({list.length})
                  </h3>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {list.map((entry) => (
                      <li
                        key={entry.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: `1px solid ${C.borderGhost}`,
                          backgroundColor: C.pageBg,
                          opacity: pendingId === entry.id ? 0.55 : 1,
                          transition: "opacity 0.15s ease",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: C.textDark,
                              lineHeight: 1.45,
                            }}
                          >
                            {entry.summary}
                          </p>
                          {entry.detail && (
                            <p
                              style={{
                                margin: "5px 0 0 0",
                                fontSize: 12,
                                color: C.textMuted,
                                lineHeight: 1.5,
                              }}
                            >
                              {entry.detail}
                            </p>
                          )}
                          <p
                            style={{
                              margin: "6px 0 0 0",
                              fontSize: 10.5,
                              color: C.textLight,
                            }}
                          >
                            {t("entryMeta", {
                              importance: entry.importance,
                              date: formatter.dateTime(
                                new Date(entry.updated_at),
                                { dateStyle: "medium" },
                              ),
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={t("archiveEntryLabel")}
                          disabled={pendingId === entry.id}
                          onClick={() => void onArchive(entry.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "none",
                            backgroundColor: "transparent",
                            color: C.textMuted,
                            cursor: pendingId === entry.id ? "not-allowed" : "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <X width={14} height={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "24px 16px",
        textAlign: "center",
        borderRadius: 12,
        border: `1px dashed ${C.borderGhost}`,
        backgroundColor: C.pageBg,
        fontSize: 13,
        color: C.textMuted,
      }}
    >
      {message}
    </div>
  );
}
