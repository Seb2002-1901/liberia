"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/stripe/config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    if (!isSupabaseConfigured()) {
      toast.error("Configuration Supabase manquante", {
        description:
          "Ajoute tes variables Supabase dans .env.local pour activer l'inscription.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            ROUTES.onboarding,
          )}`,
        },
      });
      if (error) {
        toast.error("Inscription impossible", { description: error.message });
        return;
      }

      // Two possible Supabase configs:
      //  - "Confirm email" ON: signUp returns user but no session.
      //  - "Confirm email" OFF: signUp returns user + session, user is signed in.
      if (!data.session) {
        toast.success("Compte créé.", {
          description: "Vérifie ta boîte mail pour confirmer ton adresse.",
        });
        router.push(ROUTES.login);
      } else {
        toast.success("Bienvenue dans LIBERIA.");
        router.push(ROUTES.onboarding);
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Commence ta reconstruction.
        </h1>
        <p className="text-sm text-muted-foreground">
          Création de compte en 30 secondes.
        </p>
        <div className="rounded-xl border border-[hsl(var(--gold)/0.25)] bg-[hsl(var(--gold)/0.06)] px-3 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {TRIAL_DAYS} jours gratuits
          </span>
          , puis abonnement automatique selon le plan choisi. Annulable à tout
          moment.
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Prénom / Nom" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Comment souhaites-tu être appelé·e ?"
            {...register("name")}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="toi@email.com"
            {...register("email")}
          />
        </Field>

        <Field
          label="Mot de passe"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            {...register("password")}
          />
        </Field>

        <Field
          label="Confirmation"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirme ton mot de passe"
            {...register("confirmPassword")}
          />
        </Field>

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => {
            const checked = field.value === true;
            const hasError = Boolean(errors.acceptTerms);
            return (
              <div>
                <Label
                  htmlFor="acceptTerms"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm font-normal transition-colors",
                    checked
                      ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.06)]"
                      : hasError
                        ? "border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.04)]"
                        : "border-border/60 bg-card/40 hover:border-border",
                  )}
                >
                  <Checkbox
                    id="acceptTerms"
                    checked={checked}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    className={cn(
                      "mt-0.5 h-5 w-5 transition-colors",
                      checked &&
                        "border-[hsl(var(--gold))] bg-[hsl(var(--gold))] text-background",
                    )}
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    J&apos;accepte les{" "}
                    <Link
                      href={ROUTES.terms}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      conditions d&apos;utilisation
                    </Link>{" "}
                    et la{" "}
                    <Link
                      href={ROUTES.privacy}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      politique de confidentialité
                    </Link>
                    .
                  </span>
                </Label>
                {hasError && (
                  <p className="mt-1.5 text-xs text-[hsl(var(--destructive))]">
                    {errors.acceptTerms?.message}
                  </p>
                )}
              </div>
            );
          }}
        />

        <Button type="submit" size="lg" variant="gold" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer mon compte
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit·e ?{" "}
        <Link href={ROUTES.login} className="font-medium text-foreground hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  );
}
