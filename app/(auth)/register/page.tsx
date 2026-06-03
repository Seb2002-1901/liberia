import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
