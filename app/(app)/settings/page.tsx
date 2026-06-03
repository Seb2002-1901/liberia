import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BrainCircuit, CreditCard, Database, Shield, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DataExportButton,
  DeleteAccountButton,
  SettingsPreferences,
} from "@/components/settings/settings-preferences";
import { CoachingMemoryCard } from "@/components/settings/coaching-memory";
import { getMyUserMemory } from "@/lib/services/memory";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ROUTES, type CoachingToneId, type RecurringChallengeId, type SpendingTriggerId } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.settings.metadata");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const t = await getTranslations("app.settings");
  const [prefs, memory] = await Promise.all([
    loadPreferences(),
    getMyUserMemory(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      <Card className="border-[hsl(var(--gold)/0.25)] bg-gradient-to-br from-[hsl(var(--gold)/0.04)] via-card/40 to-card/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[hsl(var(--gold))]" />
            {t("sections.memory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CoachingMemoryCard
            initialTone={(memory?.coaching_tone as CoachingToneId | null) ?? null}
            initialChallenges={
              (memory?.recurring_challenges as RecurringChallengeId[] | undefined) ?? []
            }
            initialTriggers={
              (memory?.spending_triggers as SpendingTriggerId[] | undefined) ?? []
            }
            initialNotes={memory?.progress_notes ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[hsl(var(--gold))]" /> {t("sections.notifications")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsPreferences
            weeklyEnabled={prefs.weekly}
            alertsEnabled={prefs.alerts}
            encouragementEnabled={prefs.encouragement}
            trialRemindersEnabled={prefs.trial}
            goalMilestonesEnabled={prefs.milestones}
            inactivityFollowupEnabled={prefs.inactivity}
            analyticsEnabled={prefs.analyticsEnabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[hsl(var(--gold))]" /> {t("sections.subscription")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("subscription.intro")}</p>
          <Button asChild variant="gold" size="sm">
            <Link href={ROUTES.subscription}>
              <Sparkles className="h-4 w-4" /> {t("subscription.cta")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[hsl(var(--gold))]" /> {t("sections.data")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("data.intro")}</p>
          <div className="flex flex-wrap gap-2">
            <DataExportButton />
            <DeleteAccountButton />
          </div>
          <p className="text-[11px] text-muted-foreground">{t("data.exportInfo")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[hsl(var(--gold))]" /> {t("sections.security")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t("security.intro")}</p>
          <Separator />
          <p>
            {t("security.linksBefore")}{" "}
            <Link href={ROUTES.privacy} className="text-foreground hover:underline">
              {t("security.privacyLink")}
            </Link>{" "}
            {t("security.linksAnd")}{" "}
            <Link href={ROUTES.legal} className="text-foreground hover:underline">
              {t("security.legalLink")}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

type Prefs = {
  weekly: boolean;
  alerts: boolean;
  encouragement: boolean;
  trial: boolean;
  milestones: boolean;
  inactivity: boolean;
  /** Inverted on the UI side: `true` = analytics enabled. */
  analyticsEnabled: boolean;
};

async function loadPreferences(): Promise<Prefs> {
  const DEFAULTS: Prefs = {
    weekly: true,
    alerts: true,
    encouragement: true,
    trial: true,
    milestones: true,
    inactivity: true,
    analyticsEnabled: true,
  };
  if (!isSupabaseConfigured()) return DEFAULTS;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULTS;
  const { data } = await supabase
    .from("user_settings")
    .select(
      "email_weekly_summary, notification_alerts, email_encouragement, email_trial_reminders, email_goal_milestones, email_inactivity_followup, analytics_opt_out",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  return {
    weekly: data?.email_weekly_summary ?? true,
    alerts: data?.notification_alerts ?? true,
    encouragement: data?.email_encouragement ?? true,
    trial: data?.email_trial_reminders ?? true,
    milestones: data?.email_goal_milestones ?? true,
    inactivity: data?.email_inactivity_followup ?? true,
    analyticsEnabled: !(data?.analytics_opt_out ?? false),
  };
}
