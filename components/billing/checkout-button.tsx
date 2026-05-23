"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CheckoutButtonProps {
  planId: "premium_monthly" | "premium_yearly";
}

export function CheckoutButton({ planId }: CheckoutButtonProps) {
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
        toast.error(data.error ?? "Impossible de démarrer le paiement.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="gold" className="w-full" onClick={onClick} disabled={loading}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Passer Premium
    </Button>
  );
}
