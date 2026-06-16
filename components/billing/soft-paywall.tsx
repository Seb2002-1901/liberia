import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { AccessState } from "@/lib/services/access-server";

/**
 * Sprint S2-BIS — soft paywall premium uniforme.
 *
 * Rendu en remplacement du contenu d'une page premium quand le compte
 * n'est ni `trialing` ni `active`. Le wording distingue "essai expiré"
 * (lapsed) de "pas encore abonné" (none) pour rester honnête : on
 * n'affiche pas "réactive ton essai" à un user qui n'en a jamais eu.
 *
 * Pas de design custom — palette navy V3 inline pour cohérence avec
 * /settings/subscription. Largeur max 560 → mobile-safe par défaut.
 *
 * Pas de styles externes : pas de Tailwind requis sur la page hôte.
 */
export async function SoftPaywall({
  state,
  feature,
}: {
  state: Exclude<AccessState, "premium">;
  feature: string;
}) {
  const t = await getTranslations("billing.paywall");

  const headlineKey = state === "lapsed" ? "lapsedHeadline" : "noneHeadline";
  const bodyKey = state === "lapsed" ? "lapsedBody" : "noneBody";

  return (
    <div
      style={{
        margin: "0 auto",
        maxWidth: 560,
        padding: "40px 28px",
        borderRadius: 16,
        border: "1px solid #E5E9F0",
        background: "#FFFFFF",
        boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        textAlign: "center",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "linear-gradient(135deg, #011E5F 0%, #1E3A8A 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          fontFamily: "Outfit, Inter, system-ui",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        ★
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "Outfit, Inter, system-ui",
            fontSize: 24,
            fontWeight: 700,
            color: "#0F172A",
            letterSpacing: "-0.02em",
          }}
        >
          {t(headlineKey, { feature })}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14.5,
            color: "#64748B",
            lineHeight: 1.55,
          }}
        >
          {t(bodyKey)}
        </p>
      </div>
      <Link
        href="/settings/subscription"
        style={{
          alignSelf: "center",
          padding: "13px 26px",
          borderRadius: 11,
          background: "#011E5F",
          color: "#FFFFFF",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          fontFamily: "inherit",
        }}
      >
        {t("cta")}
      </Link>
    </div>
  );
}
