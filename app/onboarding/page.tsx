import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bienvenue",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
