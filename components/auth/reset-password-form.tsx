"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { V3Field, V3Input, V3PrimaryButton } from "./login-form";
import { localizeAuthError } from "@/lib/auth/error-messages";

/**
 * Refonte V3 — Phase Auth-V3.
 *
 * Logique CRITIQUE inchangée :
 *  - useEffect getSession + onAuthStateChange listener PASSWORD_RECOVERY
 *  - 3 états : "checking" / "ready" / "missing"
 *  - Cleanup sub.subscription.unsubscribe()
 *  - supabase.auth.updateUser({ password })
 *  - router.push(ROUTES.dashboard) après succès
 *
 * JSX visuel : charte navy V3 inline.
 */

type SessionState = "checking" | "ready" | "missing";

const C = {
  navy: "#011E5F",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  danger: "#DC2626",
};

const FONT_DISPLAY = "Outfit, Inter, system-ui";

export function ResetPasswordForm() {
  const tForm = useTranslations("auth.reset");
  const tErr = useTranslations();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [sessionState, setSessionState] =
    React.useState<SessionState>("checking");

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
      toast.error(tForm("unavailableTitle"), {
        description: tForm("unavailableBody"),
      });
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(tForm("failedTitle"), {
          description: localizeAuthError(error.message, tErr),
        });
        return;
      }
      toast.success(tForm("successTitle"));
      router.push(ROUTES.dashboard);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionState === "checking") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          color: C.textMuted,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden
          style={{ animation: "v3-spin 0.7s linear infinite" }}
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke={C.textLight}
            strokeWidth="2.5"
          />
          <path
            d="M12 3a9 9 0 0 1 9 9"
            fill="none"
            stroke={C.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        {tForm("checking")}
        <style>{`@keyframes v3-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (sessionState === "missing") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: C.textDark,
            lineHeight: 1.15,
          }}
        >
          {tForm("invalidTitle")}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: C.textMuted,
            lineHeight: 1.5,
          }}
        >
          {tForm("invalidBody")}
        </p>
        <Link
          href={ROUTES.forgotPassword}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "13px 22px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 11,
            textDecoration: "none",
            marginTop: 6,
          }}
        >
          {tForm("requestNew")}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: C.textDark,
            lineHeight: 1.15,
          }}
        >
          {tForm("title")}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: C.textMuted,
            lineHeight: 1.5,
          }}
        >
          {tForm("subtitle")}
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <V3Field
          label={tForm("labels.password")}
          htmlFor="password"
          error={
            errors.password?.message ? tErr(errors.password.message) : undefined
          }
        >
          <V3Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={tForm("placeholders.password")}
            {...register("password")}
          />
        </V3Field>
        <V3Field
          label={tForm("labels.confirmPassword")}
          htmlFor="confirmPassword"
          error={
            errors.confirmPassword?.message
              ? tErr(errors.confirmPassword.message)
              : undefined
          }
        >
          <V3Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder={tForm("placeholders.confirmPassword")}
            {...register("confirmPassword")}
          />
        </V3Field>
        <V3PrimaryButton type="submit" disabled={submitting} loading={submitting}>
          {tForm("submit")}
        </V3PrimaryButton>
      </form>
    </div>
  );
}
