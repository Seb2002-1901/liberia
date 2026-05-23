"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async ({ email }: ForgotPasswordInput) => {
    if (!isSupabaseConfigured()) {
      toast.error("Configuration Supabase manquante");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${ROUTES.resetPassword}`,
      });
      if (error) {
        toast.error("Envoi impossible", { description: error.message });
        return;
      }
      setSent(true);
      toast.success("Email envoyé", {
        description: "Vérifie ta boîte mail pour réinitialiser ton mot de passe.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Mot de passe oublié.
        </h1>
        <p className="text-sm text-muted-foreground">
          Indique ton email et nous t'enverrons un lien sécurisé pour le réinitialiser.
        </p>
      </div>

      {sent ? (
        <div className="rounded-2xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)] p-5 text-sm text-[hsl(var(--success))]">
          Si un compte existe pour cet email, tu vas recevoir un lien de réinitialisation.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="toi@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-[hsl(var(--destructive))]">
                {errors.email.message}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" variant="gold" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Envoyer le lien
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href={ROUTES.login} className="font-medium text-foreground hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
