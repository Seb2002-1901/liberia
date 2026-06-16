"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { PlanId } from "@/lib/constants";

interface CheckoutButtonProps {
  planId: PlanId;
  label?: string;
  variant?: ButtonProps["variant"];
  className?: string;
}

export function CheckoutButton({
  planId,
  label,
  variant = "gold",
  className,
}: CheckoutButtonProps) {
  const t = useTranslations("app.billing");
  const [loading, setLoading] = React.useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? t("errors.checkoutFallback"));
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const isYearly = planId.endsWith("_yearly");
  const defaultLabel = isYearly
    ? t("ctaCheckoutYearly")
    : t("ctaCheckoutMonthly");

  return (
    <Button
      variant={variant}
      className={className ?? "w-full"}
      onClick={onClick}
      disabled={loading}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label ?? defaultLabel}
    </Button>
  );
}
