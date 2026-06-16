"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/utils/redirect";
import {
  isGoogleAuthConfigured,
  isAppleAuthConfigured,
  isAnySocialAuthConfigured,
} from "@/lib/env";
import { localizeAuthError } from "@/lib/auth/error-messages";

/**
 * Sprint S2-BIS — boutons social login (Google + Apple).
 *
 * Render conditionnel : on n'affiche RIEN si aucun provider n'est
 * activé (`NEXT_PUBLIC_AUTH_*_ENABLED=true`). Pas de bouton mort, pas
 * de "Continuer avec Google" qui mène à une erreur Supabase "provider
 * is not enabled".
 *
 * Le `redirectTo` pointe sur /auth/callback (route existante qui
 * exchange code → session) avec un `next` propagé pour ramener
 * l'utilisateur où il voulait aller. safeRedirectPath bloque les
 * open-redirect vers external origins.
 *
 * UX OAuth :
 *  - Pas de loader bloquant → Supabase navigue de toute façon
 *  - Toast d'erreur si signInWithOAuth retourne une error sync
 *    (provider non whitelisté côté Supabase Dashboard, etc.)
 *
 * Apple : exige NEXT_PUBLIC_APP_URL pour que Sign in with Apple
 * accepte le redirect (Apple bloque les `localhost` non-HTTPS). En
 * dev local, désactive le bouton sans config.
 */
export function SocialLoginButtons({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth.social");
  const tErr = useTranslations();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"), "/dashboard");

  if (!isAnySocialAuthConfigured()) return null;

  const handleProvider = async (provider: "google" | "apple") => {
    if (!isSupabaseConfigured()) {
      toast.error(t("unavailableTitle"), { description: t("unavailableBody") });
      return;
    }
    const supabase = createClient();
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL ?? "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast.error(t("failedTitle"), {
        description: localizeAuthError(error.message, tErr),
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        role="separator"
        aria-label={t("dividerLabel")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "#94A3B8",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "#E5E9F0" }} />
        <span>{mode === "login" ? t("dividerLogin") : t("dividerRegister")}</span>
        <div style={{ flex: 1, height: 1, background: "#E5E9F0" }} />
      </div>

      {isGoogleAuthConfigured() && (
        <ProviderButton
          provider="google"
          label={t("google")}
          onClick={() => handleProvider("google")}
        />
      )}
      {isAppleAuthConfigured() && (
        <ProviderButton
          provider="apple"
          label={t("apple")}
          onClick={() => handleProvider("apple")}
        />
      )}
    </div>
  );
}

function ProviderButton({
  provider,
  label,
  onClick,
}: {
  provider: "google" | "apple";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        padding: "12px 16px",
        borderRadius: 11,
        border: "1px solid #E5E9F0",
        background: "#FFFFFF",
        color: "#0F172A",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#F9FAFD";
        e.currentTarget.style.borderColor = "#CBD5E1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#FFFFFF";
        e.currentTarget.style.borderColor = "#E5E9F0";
      }}
    >
      {provider === "google" ? <GoogleGlyph /> : <AppleGlyph />}
      <span>{label}</span>
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">
      <path
        fill="#000000"
        d="M13.27 9.56a3.85 3.85 0 0 1 1.84-3.23 3.96 3.96 0 0 0-3.13-1.69c-1.31-.13-2.59.79-3.27.79-.7 0-1.74-.78-2.86-.75A4.16 4.16 0 0 0 2.34 6.81c-1.5 2.6-.38 6.42 1.08 8.52.72 1.03 1.57 2.18 2.69 2.14 1.09-.04 1.49-.69 2.81-.69 1.3 0 1.69.69 2.84.66 1.18-.02 1.92-1.04 2.63-2.08a9.18 9.18 0 0 0 1.2-2.45 3.72 3.72 0 0 1-2.32-3.35zM10.93 3.4a3.79 3.79 0 0 0 .87-2.71 3.85 3.85 0 0 0-2.49 1.3 3.6 3.6 0 0 0-.9 2.62 3.17 3.17 0 0 0 2.52-1.21z"
      />
    </svg>
  );
}
