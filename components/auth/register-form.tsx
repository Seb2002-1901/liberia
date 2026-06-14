"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { TRIAL_DAYS } from "@/lib/stripe/config";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { V3Field, V3Input, V3PrimaryButton } from "./login-form";

/**
 * Refonte V3 — Phase Auth-V3.
 *
 * Logique Supabase signUp + emailRedirectTo /auth/callback?next=/onboarding,
 * react-hook-form, Zod registerSchema avec acceptTerms refine, Controller
 * pattern, TRIAL_DAYS (constante pure, pas d'appel Stripe), branches
 * "Confirm email" ON/OFF → push /login ou /onboarding : INCHANGÉS.
 *
 * JSX visuel : charte navy V3 inline (tokens C, Inter, Outfit).
 */

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

export function RegisterForm() {
  const tForm = useTranslations("auth.register");
  const tErr = useTranslations();
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
      toast.error(tForm("configuringTitle"), {
        description: tForm("configuringBody"),
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
        toast.error(tForm("failedTitle"), { description: error.message });
        return;
      }

      // Two possible Supabase configs:
      //  - "Confirm email" ON: signUp returns user but no session.
      //  - "Confirm email" OFF: signUp returns user + session, user is signed in.
      if (!data.session) {
        toast.success(tForm("createdTitle"), {
          description: tForm("createdBody"),
        });
        router.push(ROUTES.login);
      } else {
        toast.success(tForm("welcome"));
        router.push(ROUTES.onboarding);
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        <div
          style={{
            marginTop: 4,
            padding: "10px 14px",
            borderRadius: 10,
            backgroundColor: C.primaryBg,
            fontSize: 12,
            color: C.textDark,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ fontWeight: 600, color: C.navy }}>
            {tForm("trialBadgeStrong", { days: TRIAL_DAYS })}
          </strong>{" "}
          <span style={{ color: C.textMuted }}>{tForm("trialBadgeRest")}</span>
        </div>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <V3Field
          label={tForm("labels.name")}
          htmlFor="name"
          error={errors.name?.message ? tErr(errors.name.message) : undefined}
        >
          <V3Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder={tForm("placeholders.name")}
            {...register("name")}
          />
        </V3Field>

        <V3Field
          label={tForm("labels.email")}
          htmlFor="email"
          error={errors.email?.message ? tErr(errors.email.message) : undefined}
        >
          <V3Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={tForm("placeholders.email")}
            {...register("email")}
          />
        </V3Field>

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

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => {
            const checked = field.value === true;
            const hasError = Boolean(errors.acceptTerms);
            return (
              <div style={{ marginTop: 4 }}>
                <label
                  htmlFor="acceptTerms"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${
                      checked
                        ? C.primary
                        : hasError
                          ? C.danger
                          : C.borderGhost
                    }`,
                    backgroundColor: checked ? C.primaryBg : C.cardBg,
                    cursor: "pointer",
                    transition: "border-color 0.15s ease, background-color 0.15s ease",
                  }}
                >
                  <V3Checkbox
                    id="acceptTerms"
                    checked={checked}
                    onChange={(v) => field.onChange(v)}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      lineHeight: 1.5,
                    }}
                  >
                    {tForm("acceptBefore")}{" "}
                    <Link
                      href={ROUTES.terms}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: C.textDark,
                        fontWeight: 600,
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                      }}
                    >
                      {tForm("termsLink")}
                    </Link>{" "}
                    {tForm("and")}{" "}
                    <Link
                      href={ROUTES.privacy}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: C.textDark,
                        fontWeight: 600,
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                      }}
                    >
                      {tForm("privacyLink")}
                    </Link>
                    .
                  </span>
                </label>
                {hasError && errors.acceptTerms?.message && (
                  <p
                    style={{
                      margin: "6px 2px 0 2px",
                      fontSize: 11.5,
                      color: C.danger,
                      fontWeight: 500,
                    }}
                  >
                    {tErr(errors.acceptTerms.message)}
                  </p>
                )}
              </div>
            );
          }}
        />

        <V3PrimaryButton type="submit" disabled={submitting} loading={submitting}>
          {tForm("submit")}
        </V3PrimaryButton>
      </form>

      <p
        style={{
          textAlign: "center",
          fontSize: 13,
          color: C.textMuted,
          margin: 0,
        }}
      >
        {tForm("alreadyRegistered")}{" "}
        <Link
          href={ROUTES.login}
          style={{
            color: C.textDark,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {tForm("loginLink")}
        </Link>
      </p>
    </div>
  );
}

function V3Checkbox({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 6,
        border: `1.5px solid ${checked ? C.navy : C.textLight}`,
        backgroundColor: checked ? C.navy : C.cardBg,
        flexShrink: 0,
        cursor: "pointer",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        marginTop: 1,
      }}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />
    </span>
  );
}
