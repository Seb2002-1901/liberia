"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function CheckoutFeedback() {
  const t = useTranslations("app.billing.feedback");
  const params = useSearchParams();
  const status = params.get("status");

  useEffect(() => {
    if (!status) return;
    if (status === "success") {
      toast.success(t("successTitle"), {
        description: t("successBody"),
      });
    } else if (status === "cancel") {
      toast.info(t("cancelled"));
    }
  }, [status, t]);

  return null;
}
