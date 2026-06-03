"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { safeRedirectPath } from "@/lib/utils/redirect";

export function LoginForm() {
  const tForm = useTranslations("auth.login");
  const tErr = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"), ROUTES.dashboard);
  const [submitting, setSubmitting] = React.useState(false);

  // Surface auth-callback failures (expired email link, etc.) on arrival.
  const errorParam = params.get("error");
  React.useEffect(() => {
    if (errorParam === "auth_callback") {
      toast.error(tForm("expiredLinkTitle"), {
        description: tForm("expiredLinkBody"),
      });
    }
  }, [errorParam, tForm]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    if (!isSupabaseConfigured()) {
      toast.error(tForm("configuringTitle"), {
        description: tForm("configuringBody"),
      });
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        toast.error(tForm("failedTitle"), { description: error.message });
        return;
      }
      toast.success(tForm("successWelcome"));
      router.push(next);
      router.refresh();
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field
          label={tForm("labels.email")}
          htmlFor="email"
          error={errors.email?.message ? tErr(errors.email.message) : undefined}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={tForm("placeholders.email")}
            {...register("email")}
          />
        </Field>

        <Field
          label={tForm("labels.password")}
          htmlFor="password"
          error={errors.password?.message ? tErr(errors.password.message) : undefined}
          hint={
            <Link
              href={ROUTES.forgotPassword}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {tForm("forgot")}
            </Link>
          }
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={tForm("placeholders.password")}
            {...register("password")}
          />
        </Field>

        <Button type="submit" size="lg" variant="gold" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {tForm("submit")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {tForm("noAccount")}{" "}
        <Link href={ROUTES.register} className="font-medium text-foreground hover:underline">
          {tForm("createAccount")}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint}
      </div>
      {children}
      {error && (
        <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
      )}
    </div>
  );
}
