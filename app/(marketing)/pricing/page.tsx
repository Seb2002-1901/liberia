import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { FaqSection } from "@/components/marketing/sections";
import { TRIAL_DAYS } from "@/lib/stripe/config";

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
};
const FONT_DISPLAY = "Outfit, Inter, system-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.pricingPage.metadata");
  return {
    title: t("title"),
    description: t("description", { days: TRIAL_DAYS }),
  };
}

export default async function PricingPage() {
  const t = await getTranslations("marketing.pricingPage");
  return (
    <>
      <section
        style={{
          backgroundColor: C.pageBg,
          padding: "64px 0 56px 0",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "0 24px",
            textAlign: "center",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            color: C.textDark,
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
          <h1
            style={{
              margin: "14px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: C.textDark,
              lineHeight: 1.1,
            }}
          >
            {t("title")}
          </h1>
          <p
            style={{
              margin: "14px 0 0 0",
              fontSize: 15,
              color: C.textMuted,
              lineHeight: 1.55,
            }}
          >
            {t("subtitle", { days: TRIAL_DAYS })}
          </p>
        </div>
      </section>
      <PricingPreview />
      <FaqSection />
    </>
  );
}
