import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BrainCircuit, CreditCard, Database, Shield, Sparkles } from "lucide-react";
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

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function SettingsPage() {
  const [prefs, memory] = await Promise.all([
    loadPreferences(),
    getMyUserMemory(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compte"
        title="Paramètres"
        description="Ajuste tes préférences et gère tes données."
      />

      <Card className="border-[hsl(var(--gold)/0.25)] bg-gradient-to-br from-[hsl(var(--gold)/0.04)] via-card/40 to-card/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[hsl(var(--gold))]" />
            Mémoire de coaching
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
            <Bell className="h-4 w-4 text-[hsl(var(--gold))]" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsPreferences
            weeklyEnabled={prefs.weekly}
            alertsEnabled={prefs.alerts}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[hsl(var(--gold))]" /> Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gère ton plan, ta facturation et ton accès Premium.
          </p>
          <Button asChild variant="gold" size="sm">
            <Link href={ROUTES.subscription}>
              <Sparkles className="h-4 w-4" /> Gérer mon abonnement
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[hsl(var(--gold))]" /> Données &
            confidentialité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Conformément au RGPD, tu peux exporter ou supprimer définitivement
            l'ensemble de tes données.
          </p>
          <div className="flex flex-wrap gap-2">
            <DataExportButton />
            <DeleteAccountButton />
          </div>
          <p className="text-[11px] text-muted-foreground">
            L'export contient profil, revenus, dépenses, objectifs, plans IA et
            historique des conversations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[hsl(var(--gold))]" /> Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Tes données sont chiffrées au repos et en transit. Chaque
            utilisateur n&apos;accède qu&apos;à ses propres données — isolation
            stricte appliquée côté base.
          </p>
          <Separator />
          <p>
            Consulte aussi notre{" "}
            <Link href={ROUTES.privacy} className="text-foreground hover:underline">
              politique de confidentialité
            </Link>{" "}
            et le{" "}
            <Link href={ROUTES.legal} className="text-foreground hover:underline">
              disclaimer légal
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function loadPreferences(): Promise<{ weekly: boolean; alerts: boolean }> {
  if (!isSupabaseConfigured()) return { weekly: true, alerts: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { weekly: true, alerts: true };
  const { data } = await supabase
    .from("user_settings")
    .select("email_weekly_summary, notification_alerts")
    .eq("user_id", user.id)
    .maybeSingle();
  return {
    weekly: data?.email_weekly_summary ?? true,
    alerts: data?.notification_alerts ?? true,
  };
}
