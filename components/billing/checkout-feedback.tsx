"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function CheckoutFeedback() {
  const params = useSearchParams();
  const status = params.get("status");

  useEffect(() => {
    if (!status) return;
    if (status === "success") {
      toast.success("Paiement reçu. Bienvenue dans Premium.", {
        description:
          "Ton accès est en cours d'activation, ça peut prendre quelques secondes.",
      });
    } else if (status === "cancel") {
      toast.info("Paiement annulé. Tu peux réessayer à tout moment.");
    }
  }, [status]);

  return null;
}
