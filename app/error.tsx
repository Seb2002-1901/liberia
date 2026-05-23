"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LIBERIA] runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container py-6">
        <BrandMark />
      </div>
      <div className="container my-auto flex flex-col items-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--destructive))]">
          Une erreur est survenue
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Quelque chose s'est cassé.
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          On a noté l'incident. Tu peux réessayer ou revenir à l'accueil — tes données restent intactes.
        </p>
        <div className="mt-7 flex gap-3">
          <Button variant="gold" size="lg" onClick={() => reset()}>
            Réessayer
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
