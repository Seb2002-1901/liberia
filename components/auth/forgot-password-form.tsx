"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const tForm = useTranslations("auth.forgot");
  const tErr = useTranslations();
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
      toast.error(tForm("unavailableTitle"), {
        description: tForm("unavailableBody"),
      });
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Routes Supabase via /auth/callback so the PKCE `code` is exchanged
        // for a session before landing on the reset-password screen.
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          ROUTES.resetPassword,
        )}`,
      });
      if (error) {
        toast.error(tForm("failedTitle"), { description: error.message });
        return;
      }
      setSent(true);
      toast.success(tForm("successTitle"), {
        description: tForm("successBody"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {tForm("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{tForm("subtitle")}</p>
      </div>

      {sent ? (
        <div className="rounded-2xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)] p-5 text-sm text-[hsl(var(--success))]">
          {tForm("sentBody")}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">{tForm("labels.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={tForm("placeholders.email")}
              {...register("email")}
            />
            {errors.email?.message && (
              <p className="text-xs text-[hsl(var(--destructive))]">
                {tErr(errors.email.message)}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" variant="gold" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {tForm("submit")}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href={ROUTES.login} className="font-medium text-foreground hover:underline">
          {tForm("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
