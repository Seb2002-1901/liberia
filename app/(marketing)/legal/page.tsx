import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Avertissement légal — LIBERIA n'est pas un conseiller financier.",
};

export default function LegalPage() {
  return (
    <article className="container max-w-3xl py-16">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
        Disclaimer
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Avertissement légal.
      </h1>

      <div className="mt-8 flex gap-4 rounded-2xl border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.06)] p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--warning))]" />
        <div className="space-y-2 text-sm text-foreground/90">
          <p className="font-medium">
            LIBERIA est un outil de pilotage personnel, pas un conseiller financier.
          </p>
          <p className="text-muted-foreground">
            Les indicateurs, scores et recommandations affichés sont informatifs.
            Ils ne constituent <strong>pas</strong> un conseil financier, fiscal, juridique
            ou d'investissement. Toute décision importante doit être prise avec un
            professionnel agréé adapté à ta situation.
          </p>
          <p className="text-muted-foreground">
            LIBERIA ne peut être tenu responsable d'une décision prise sur la base seule
            des informations affichées dans l'application.
          </p>
        </div>
      </div>
    </article>
  );
}
