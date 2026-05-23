import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getFinanceData } from "@/lib/services/finance";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const data = await getFinanceData();
  const name = data.profile.full_name ?? "Membre";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compte"
        title="Profil"
        description="Tes informations personnelles. Modifiables à tout moment."
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--gold)/0.4)] to-[hsl(var(--gold-muted)/0.2)] text-base text-[hsl(var(--gold))]">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{data.profile.email}</p>
              <Badge variant={data.subscription.plan === "premium" ? "gold" : "secondary"} className="mt-1">
                Plan {data.subscription.plan === "premium" ? "Premium" : "Gratuit"}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Nom complet" value={name} />
            <FormRow label="Email" value={data.profile.email} />
            <FormRow label="Devise" value={data.profile.currency} />
            <FormRow label="Langue" value={data.profile.locale} />
          </div>

          <p className="text-xs text-muted-foreground">
            La modification du profil sera enrichie dans la prochaine phase. Pour toute demande
            urgente, contacte-nous à support@liberia.app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FormRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} readOnly className="cursor-default" />
    </div>
  );
}
