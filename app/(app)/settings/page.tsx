import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Shield, Bell, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compte"
        title="Paramètres"
        description="Ajuste ton expérience LIBERIA."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[hsl(var(--gold))]" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Row
            title="Résumé hebdomadaire par email"
            description="Chaque dimanche, un récap court de ta semaine financière."
            control={<Switch defaultChecked disabled />}
          />
          <Row
            title="Alertes importantes"
            description="Reste à vivre négatif, objectifs en retard, etc."
            control={<Switch defaultChecked disabled />}
          />
          <p className="text-xs text-muted-foreground">
            Préférences fines disponibles dans la prochaine phase.
          </p>
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
            <Shield className="h-4 w-4 text-[hsl(var(--gold))]" /> Sécurité & données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Tes données sont chiffrées et accessibles uniquement par toi. Tu peux exporter ou
            supprimer ton compte en envoyant un email à <strong>privacy@liberia.app</strong>.
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
