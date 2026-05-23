"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

type SessionState = "checking" | "ready" | "missing";

export function ResetPasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [sessionState, setSessionState] = React.useState<SessionState>("checking");

  React.useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured()) {
      setSessionState("missing");
      return;
    }

    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionState(data.session ? "ready" : "missing");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) setSessionState("ready");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async ({ password }: ResetPasswordInput) => {
    if (!isSupabaseConfigured()) {
      toast.error("Configuration Supabase manquante");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error("Mise à jour impossible", { description: error.message });
        return;
      }
      toast.success("Mot de passe mis à jour.");
      router.push(ROUTES.dashboard);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionState === "checking") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Vérification du lien…
      </div>
    );
  }

  if (sessionState === "missing") {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Lien invalide ou expiré.
        </h1>
        <p className="text-sm text-muted-foreground">
          Le lien de réinitialisation est invalide, déjà utilisé ou expiré.
          Demande un nouvel email pour continuer.
        </p>
        <Button asChild variant="gold" size="lg">
          <Link href={ROUTES.forgotPassword}>Demander un nouveau lien</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Nouveau mot de passe.
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisis un mot de passe robuste, d'au moins 8 caractères.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-[hsl(var(--destructive))]">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmation</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirme ton mot de passe"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-[hsl(var(--destructive))]">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" variant="gold" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Mettre à jour
        </Button>
      </form>
    </div>
  );
}
