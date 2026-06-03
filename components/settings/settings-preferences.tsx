"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  deleteAccount,
  exportUserData,
  setAnalyticsOptOut,
  setEmailPreference,
  setEmailWeeklySummary,
  setNotificationAlerts,
  type EmailPreferenceKey,
} from "@/app/actions/settings";

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

  const onWeeklyChange = (v: boolean) => {
    setWeekly(v);
    startTransition(async () => {
      const res = await setEmailWeeklySummary(v);
      if (!res.ok) {
        setWeekly(!v);
        toast.error(res.error);
      }
    });
  };

  const onAlertsChange = (v: boolean) => {
    setAlerts(v);
    startTransition(async () => {
      const res = await setNotificationAlerts(v);
      if (!res.ok) {
        setAlerts(!v);
        toast.error(res.error);
      }
    });
  };

  const makePrefHandler =
    (
      key: EmailPreferenceKey,
      setter: React.Dispatch<React.SetStateAction<boolean>>,
    ) =>
    (v: boolean) => {
      setter(v);
      startTransition(async () => {
        const res = await setEmailPreference(key, v);
        if (!res.ok) {
          setter(!v);
          toast.error(res.error);
        }
      });
    };

  return (
    <div className="space-y-5">
      <Row
        title={t("weekly.title")}
        description={t("weekly.description")}
        control={
          <Switch checked={weekly} onCheckedChange={onWeeklyChange} disabled={pending} />
        }
      />
      <Row
        title={t("alerts.title")}
        description={t("alerts.description")}
        control={
          <Switch checked={alerts} onCheckedChange={onAlertsChange} disabled={pending} />
        }
      />
      <Row
        title={t("encouragement.title")}
        description={t("encouragement.description")}
        control={
          <Switch
            checked={encouragement}
            onCheckedChange={makePrefHandler("email_encouragement", setEncouragement)}
            disabled={pending}
          />
        }
      />
      <Row
        title={t("milestones.title")}
        description={t("milestones.description")}
        control={
          <Switch
            checked={milestones}
            onCheckedChange={makePrefHandler("email_goal_milestones", setMilestones)}
            disabled={pending}
          />
        }
      />
      <Row
        title={t("inactivity.title")}
        description={t("inactivity.description")}
        control={
          <Switch
            checked={inactivity}
            onCheckedChange={makePrefHandler("email_inactivity_followup", setInactivity)}
            disabled={pending}
          />
        }
      />
      <Row
        title={t("trial.title")}
        description={t("trial.description")}
        control={
          <Switch
            checked={trial}
            onCheckedChange={makePrefHandler("email_trial_reminders", setTrial)}
            disabled={pending}
          />
        }
      />
      <Row
        title={t("analytics.title")}
        description={t("analytics.description")}
        control={
          <Switch
            checked={analytics}
            onCheckedChange={(v) => {
              setAnalytics(v);
              startTransition(async () => {
                const res = await setAnalyticsOptOut(!v);
                if (!res.ok) {
                  setAnalytics(!v);
                  toast.error(res.error);
                }
              });
            }}
            disabled={pending}
          />
        }
      />
    </div>
  );
}

function Row({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  );
}

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
    <Button variant="outline" onClick={onClick} disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {t("exportCta")}
    </Button>
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
      // On success, deleteAccount() redirects — we won't get here.
    } catch {
      // redirect() throws — this is the success path. A real network
      // failure also lands here; the finally below ensures the button
      // unlocks so the user can retry instead of staring at a forever
      // spinner.
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={pending}
      className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)]"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {t("deleteCta")}
    </Button>
  );
}
