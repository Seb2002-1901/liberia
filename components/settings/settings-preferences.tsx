"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
        title="Résumé hebdomadaire par email"
        description="Chaque dimanche, un récap court de ta semaine financière."
        control={
          <Switch
            checked={weekly}
            onCheckedChange={onWeeklyChange}
            disabled={pending}
          />
        }
      />
      <Row
        title="Alertes importantes"
        description="Reste à vivre négatif, objectifs en retard."
        control={
          <Switch
            checked={alerts}
            onCheckedChange={onAlertsChange}
            disabled={pending}
          />
        }
      />
      <Row
        title="Encouragements de progression"
        description="Un email court quand le coach détecte une avancée notable."
        control={
          <Switch
            checked={encouragement}
            onCheckedChange={makePrefHandler("email_encouragement", setEncouragement)}
            disabled={pending}
          />
        }
      />
      <Row
        title="Rappels d'objectifs"
        description="Quand un objectif franchit un palier (50 / 80 / 100%)."
        control={
          <Switch
            checked={milestones}
            onCheckedChange={makePrefHandler("email_goal_milestones", setMilestones)}
            disabled={pending}
          />
        }
      />
      <Row
        title="Suivi du coach"
        description="Un email doux après plusieurs jours d'inactivité."
        control={
          <Switch
            checked={inactivity}
            onCheckedChange={makePrefHandler("email_inactivity_followup", setInactivity)}
            disabled={pending}
          />
        }
      />
      <Row
        title="Rappels d'essai et de paiement"
        description="Avant la fin de l'essai et en cas de problème de paiement. Recommandé."
        control={
          <Switch
            checked={trial}
            onCheckedChange={makePrefHandler("email_trial_reminders", setTrial)}
            disabled={pending}
          />
        }
      />
      <Row
        title="Analytique produit anonyme"
        description="Compteurs agrégés (jamais nominatifs) pour améliorer LIBERIA. Aucune revente, aucun tracking publicitaire."
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
      toast.success("Export téléchargé.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Télécharger mes données (JSON)
    </Button>
  );
}

export function DeleteAccountButton() {
  const [pending, setPending] = React.useState(false);

  const onClick = async () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm(
      "Supprimer définitivement ton compte LIBERIA ? Cette action est irréversible et efface toutes tes données (revenus, dépenses, objectifs, plans IA, conversations).",
    );
    if (!confirmed) return;
    const phrase = window.prompt(
      'Pour confirmer, tape "supprimer" exactement.',
    );
    if (phrase?.trim().toLowerCase() !== "supprimer") {
      toast.info("Suppression annulée.");
      return;
    }
    setPending(true);
    try {
      const res = await deleteAccount();
      if (res && !res.ok) {
        toast.error(res.error);
        setPending(false);
      }
      // On success, deleteAccount() redirects — we won't get here.
    } catch {
      // redirect() throws — this is the success path
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
      Supprimer mon compte
    </Button>
  );
}
