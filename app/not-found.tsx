import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container py-6">
        <BrandMark />
      </div>
      <div className="container my-auto flex flex-col items-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
          Erreur 404
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Cette page s'est égarée.
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Le lien est peut-être incorrect ou la page a été déplacée. Reviens sereinement à l'accueil.
        </p>
        <Button asChild variant="gold" size="lg" className="mt-7">
          <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </div>
  );
}
