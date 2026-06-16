"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { V3Field, V3Input, V3PrimaryButton } from "./login-form";
import { localizeAuthError } from "@/lib/auth/error-messages";
import {
  checkAuthThrottle,
  bumpAuthThrottle,
} from "@/lib/auth/client-throttle";

/**
 * Refonte V3 — Phase Auth-V3.
 *
 * Logique Supabase resetPasswordForEmail + redirectTo /auth/callback?
 * next=/reset-password, react-hook-form, Zod forgotPasswordSchema,
 * état local `sent` : INCHANGÉS.
 *
 * JSX visuel : charte navy V3 inline.
 */

const C = {
  navy: "#011E5F",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  success: "#10A37F",
  successBg: "#ECFDF5",
};

const FONT_DISPLAY = "Outfit, Inter, system-ui";

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
    // Throttle forgot-password : Supabase rate-limit déjà strict côté
    // GoTrue (3/h par email), mais doubler côté client évite que le
    // user reclique 12 fois en se demandant si "ça a marché".
    const throttleKey = `forgot:${email.trim().toLowerCase()}`;
    const check = checkAuthThrottle(throttleKey);
    if (!check.allowed) {
      toast.error(tErr("auth.errors.rateLimitExceeded"), {
        description: tErr("auth.errors.retryInSeconds", {
          seconds: check.retryInSeconds,
        }),
      });
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          ROUTES.resetPassword,
        )}`,
      });
      if (error) {
        bumpAuthThrottle(throttleKey);
        toast.error(tForm("failedTitle"), {
          description: localizeAuthError(error.message, tErr),
        });
        return;
      }
      // Reset password est "fire-and-forget" : on incrémente même en
      // cas de succès pour rate-limit cumulatif (le user peut sinon
      // spammer des emails à des inconnus depuis son compte).
      bumpAuthThrottle(throttleKey);
      setSent(true);
      toast.success(tForm("successTitle"), {
        description: tForm("successBody"),
      });
    } finally {
      setSubmitting(false);
    }
  };

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

      {sent ? (
        <div
          style={{
            padding: "18px 18px",
            borderRadius: 12,
            backgroundColor: C.successBg,
            border: `1px solid rgba(16, 163, 127, 0.18)`,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: C.success,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: C.success,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {tForm("sentBody")}
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <V3Field
            label={tForm("labels.email")}
            htmlFor="email"
            error={
              errors.email?.message ? tErr(errors.email.message) : undefined
            }
          >
            <V3Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={tForm("placeholders.email")}
              {...register("email")}
            />
          </V3Field>
          <V3PrimaryButton type="submit" disabled={submitting} loading={submitting}>
            {tForm("submit")}
          </V3PrimaryButton>
        </form>
      )}

      <p
        style={{
          textAlign: "center",
          fontSize: 13,
          color: C.textMuted,
          margin: 0,
        }}
      >
        <Link
          href={ROUTES.login}
          style={{
            color: C.textDark,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {tForm("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
