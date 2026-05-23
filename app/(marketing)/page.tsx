import { Hero } from "@/components/marketing/hero";
import {
  CtaSection,
  FaqSection,
  FeaturesSection,
  HowItWorks,
  ProblemSection,
  SecuritySection,
  SolutionSection,
} from "@/components/marketing/sections";
import { PricingPreview } from "@/components/marketing/pricing-preview";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <FeaturesSection />
      <SecuritySection />
      <PricingPreview />
      <FaqSection />
      <CtaSection />
    </>
  );
}
