import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { ROUTES } from "@/lib/constants";
import { TRIAL_DAYS } from "@/lib/stripe/config";

const C = {
  primary: "#2563EB",
  textDark: "#0F172A",
  textMuted: "#64748B",
  borderGhost: "#E5E9F0",
};
const FONT_DISPLAY = "Outfit, Inter, system-ui";

export async function PricingPreview() {
  const t = await getTranslations("marketing.pricingPreview");
  return (
    <section id="pricing" style={{ borderTop: `1px solid ${C.borderGhost}` }}>
      <div className="container" style={{ padding: "72px 24px" }}>
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            textAlign: "center",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: C.primary,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            {t("eyebrow")}
          </p>
          <h2
            style={{
              margin: "14px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: C.textDark,
              lineHeight: 1.15,
            }}
          >
            {t("title", { days: TRIAL_DAYS })}
          </h2>
          <p
            style={{
              margin: "10px 0 0 0",
              fontSize: 14.5,
              color: C.textMuted,
              lineHeight: 1.55,
            }}
          >
            {t("subtitle")}
          </p>
        </div>

        <div style={{ marginTop: 40 }}>
          <PricingPlans variant="marketing" />
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link
            href={ROUTES.pricing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: C.textMuted,
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            {t("seeAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
