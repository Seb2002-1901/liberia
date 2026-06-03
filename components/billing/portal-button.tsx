"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PortalButton() {
  const t = useTranslations("app.billing");
  const [loading, setLoading] = React.useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? t("errors.portalFallback"));
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onClick} variant="outline" disabled={loading}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {t("portal")}
    </Button>
  );
}
