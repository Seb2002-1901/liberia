"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  V3Switch,
  V3InlineButton,
  V3_TOKENS as C,
} from "@/components/ui/v3-atoms";
import {
  deleteAccount,
  exportUserData,
  setAnalyticsOptOut,
  setEmailPreference,
  setEmailWeeklySummary,
  setNotificationAlerts,
  type EmailPreferenceKey,
} from "@/app/actions/settings";

/**
 * Refonte V3 — Phase Hardening.
 * Plus aucune dépendance shadcn. V3Switch + V3InlineButton.
 * Logique server actions inchangée.
 */

interface SettingsPreferencesProps {
  weeklyEnabled: boolean;
  alertsEnabled: boolean;
  encouragementEnabled: boolean;
  trialRemindersEnabled: boolean;
  goalMilestonesEnabled: boolean;
  inactivityFollowupEnabled: boolean;
  /** Inverted UX: toggle is "Analytics activés" → false means opted-out. */
  analyticsEnabled: boolean;
}

export function SettingsPreferences({
  weeklyEnabled,
  alertsEnabled,
  encouragementEnabled,
  trialRemindersEnabled,
  goalMilestonesEnabled,
  inactivityFollowupEnabled,
  analyticsEnabled,
}: SettingsPreferencesProps) {
  const t = useTranslations("app.settings.prefs");
  const [weekly, setWeekly] = React.useState(weeklyEnabled);
  const [alerts, setAlerts] = React.useState(alertsEnabled);
  const [encouragement, setEncouragement] = React.useState(encouragementEnabled);
  const [trial, setTrial] = React.useState(trialRemindersEnabled);
  const [milestones, setMilestones] = React.useState(goalMilestonesEnabled);
  const [inactivity, setInactivity] = React.useState(inactivityFollowupEnabled);
  const [analytics, setAnalytics] = React.useState(analyticsEnabled);
  const [pending, startTransition] = React.useTransition();
  const [lastSavedKey, setLastSavedKey] = React.useState<string | null>(null);

  const handleSave = (
    key: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    prev: boolean,
    next: boolean,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) => {
    setter(next);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setter(prev);
        toast.error(res.error);
        return;
      }
      setLastSavedKey(key);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Row
        title={t("weekly.title")}
        description={t("weekly.description")}
        checked={weekly}
        onChange={(v) =>
          handleSave(
            "weekly",
            setWeekly,
            weekly,
            v,
            async () => await setEmailWeeklySummary(v),
          )
        }
        disabled={pending}
        savedJustNow={lastSavedKey === "weekly"}
      />
      <Row
        title={t("alerts.title")}
        description={t("alerts.description")}
        checked={alerts}
        onChange={(v) =>
          handleSave(
            "alerts",
            setAlerts,
            alerts,
            v,
            async () => await setNotificationAlerts(v),
          )
        }
        disabled={pending}
        savedJustNow={lastSavedKey === "alerts"}
      />
      <PrefRow
        keyName="email_encouragement"
        title={t("encouragement.title")}
        description={t("encouragement.description")}
        checked={encouragement}
        setChecked={setEncouragement}
        handleSave={handleSave}
        pending={pending}
        savedJustNow={lastSavedKey === "email_encouragement"}
      />
      <PrefRow
        keyName="email_goal_milestones"
        title={t("milestones.title")}
        description={t("milestones.description")}
        checked={milestones}
        setChecked={setMilestones}
        handleSave={handleSave}
        pending={pending}
        savedJustNow={lastSavedKey === "email_goal_milestones"}
      />
      <PrefRow
        keyName="email_inactivity_followup"
        title={t("inactivity.title")}
        description={t("inactivity.description")}
        checked={inactivity}
        setChecked={setInactivity}
        handleSave={handleSave}
        pending={pending}
        savedJustNow={lastSavedKey === "email_inactivity_followup"}
      />
      <PrefRow
        keyName="email_trial_reminders"
        title={t("trial.title")}
        description={t("trial.description")}
        checked={trial}
        setChecked={setTrial}
        handleSave={handleSave}
        pending={pending}
        savedJustNow={lastSavedKey === "email_trial_reminders"}
      />
      <Row
        title={t("analytics.title")}
        description={t("analytics.description")}
        checked={analytics}
        onChange={(v) => {
          handleSave(
            "analytics",
            setAnalytics,
            analytics,
            v,
            async () => await setAnalyticsOptOut(!v),
          );
        }}
        disabled={pending}
        savedJustNow={lastSavedKey === "analytics"}
      />
    </div>
  );
}

function PrefRow({
  keyName,
  title,
  description,
  checked,
  setChecked,
  handleSave,
  pending,
  savedJustNow,
}: {
  keyName: EmailPreferenceKey;
  title: string;
  description: string;
  checked: boolean;
  setChecked: React.Dispatch<React.SetStateAction<boolean>>;
  handleSave: (
    key: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    prev: boolean,
    next: boolean,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) => void;
  pending: boolean;
  savedJustNow: boolean;
}) {
  return (
    <Row
      title={title}
      description={description}
      checked={checked}
      onChange={(v) =>
        handleSave(
          keyName,
          setChecked,
          checked,
          v,
          async () => await setEmailPreference(keyName, v),
        )
      }
      disabled={pending}
      savedJustNow={savedJustNow}
    />
  );
}

function Row({
  title,
  description,
  checked,
  onChange,
  disabled,
  savedJustNow,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  savedJustNow?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        padding: "14px 0",
        borderBottom: `1px solid ${C.borderGhost}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 600,
              color: C.textDark,
              lineHeight: 1.35,
            }}
          >
            {title}
          </p>
          {savedJustNow && <SavedDot />}
        </div>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: 12,
            color: C.textMuted,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
      <V3Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        ariaLabel={title}
      />
    </div>
  );
}

function SavedDot() {
  return (
    <span
      aria-label="Sauvegardé"
      title="Sauvegardé"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 14,
        height: 14,
        borderRadius: 999,
        backgroundColor: C.success,
        flexShrink: 0,
      }}
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

/* ════════════ Export buttons (export + delete) ════════════ */

export function DataExportButton() {
  const t = useTranslations("app.settings.data");
  const [pending, setPending] = React.useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      const res = await exportUserData();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([res.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("exportDone"));
    } finally {
      setPending(false);
    }
  };

  return (
    <V3InlineButton variant="ghost" onClick={onClick} loading={pending}>
      {t("exportCta")}
    </V3InlineButton>
  );
}

export function DeleteAccountButton() {
  const t = useTranslations("app.settings.data");
  const [pending, setPending] = React.useState(false);

  const onClick = async () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm(t("deleteConfirm"));
    if (!confirmed) return;
    const phrase = window.prompt(t("deletePrompt"));
    if (phrase?.trim().toLowerCase() !== t("deleteKeyword").toLowerCase()) {
      toast.info(t("deleteCancelled"));
      return;
    }
    setPending(true);
    try {
      const res = await deleteAccount();
      if (res && !res.ok) {
        toast.error(res.error);
      }
    } catch {
      // redirect() throws — success path
    } finally {
      setPending(false);
    }
  };

  return (
    <V3InlineButton variant="danger" onClick={onClick} loading={pending}>
      {t("deleteCta")}
    </V3InlineButton>
  );
}
