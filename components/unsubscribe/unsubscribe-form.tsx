"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmUnsubscribe } from "@/app/actions/unsubscribe";

interface UnsubscribeFormProps {
  token: string;
}

export function UnsubscribeForm({ token }: UnsubscribeFormProps) {
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const res = await confirmUnsubscribe(token);
      if (!res.ok) {
        setState("error");
        setError(res.error);
        return;
      }
      setState("ok");
    } finally {
      setPending(false);
    }
  };

  if (state === "ok") {
    return (
      <>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
          Désinscription
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          C'est fait.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Tu ne recevras plus le récap hebdomadaire de LIBERIA. Tu peux le
          réactiver à tout moment depuis tes paramètres.
        </p>
      </>
    );
  }

  if (state === "error") {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Lien invalide
        </h1>
        <p className="mt-3 text-muted-foreground">
          {error ?? "Ce lien de désinscription n'est pas reconnu. Ouvre tes paramètres dans LIBERIA pour gérer tes préférences emails."}
        </p>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Se désinscrire des emails ?
      </h1>
      <p className="text-muted-foreground">
        Tu ne recevras plus le récap hebdomadaire de LIBERIA. Tu peux le
        réactiver depuis tes paramètres à tout moment.
      </p>
      <Button type="submit" variant="gold" size="lg" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirmer la désinscription
      </Button>
    </form>
  );
}
