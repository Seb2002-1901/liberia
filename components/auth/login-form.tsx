"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { safeRedirectPath } from "@/lib/utils/redirect";
import { localizeAuthError } from "@/lib/auth/error-messages";

/**
 * Refonte V3 — Phase Auth-V3.
 *
 * Logique Supabase / react-hook-form / Zod / i18n / safeRedirectPath /
 * ROUTES inchangée. Seul le JSX visuel adopte la charte navy V3
 * (tokens C, Inter, Outfit, ombres, inputs blancs, CTA navy plein).
 */

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
};

const FONT_DISPLAY = "Outfit, Inter, system-ui";

export function LoginForm() {
  const tForm = useTranslations("auth.login");
  const tErr = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"), ROUTES.dashboard);
  const [submitting, setSubmitting] = React.useState(false);

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
        toast.error(tForm("failedTitle"), {
          description: localizeAuthError(error.message, tErr),
        });
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
          hint={
            <Link
              href={ROUTES.forgotPassword}
              style={{
                fontSize: 12,
                color: C.primary,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {tForm("forgot")}
            </Link>
          }
        >
          <V3Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={tForm("placeholders.password")}
            {...register("password")}
          />
        </V3Field>

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
        {tForm("noAccount")}{" "}
        <Link
          href={ROUTES.register}
          style={{
            color: C.textDark,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {tForm("createAccount")}
        </Link>
      </p>
    </div>
  );
}

/* ═══════════════ V3 ATOMS — inline, isolés ═══════════════ */

export function V3Field({
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textDark,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p
          style={{
            margin: 0,
            fontSize: 11.5,
            color: C.danger,
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export const V3Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function V3Input(props, ref) {
  return (
    <input
      ref={ref}
      {...props}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${C.borderGhost}`,
        backgroundColor: C.cardBg,
        fontSize: 16,
        color: C.textDark,
        fontFamily: "inherit",
        outline: "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        ...(props.style ?? {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = C.primary;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.primaryBg}`;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = C.borderGhost;
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
});

export function V3PrimaryButton({
  children,
  loading = false,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        marginTop: 4,
        padding: "13px 22px",
        backgroundColor: C.navy,
        color: "white",
        fontSize: 14,
        fontWeight: 600,
        borderRadius: 11,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "opacity 0.15s ease",
        fontFamily: "inherit",
      }}
    >
      {loading && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden
          style={{
            animation: "v3-spin 0.7s linear infinite",
          }}
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="white"
            strokeOpacity="0.3"
            strokeWidth="2.5"
          />
          <path
            d="M12 3a9 9 0 0 1 9 9"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
      <style>{`@keyframes v3-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
