import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S2 — mot-marque "LIBERIA" + petite icône graph.
 *
 * Refonte light premium : finis le badge or et l'ombre dorée.
 * L'icône passe sur un fond bleu marine (token --navy), le texte
 * "LIBERIA" en navy uppercase wide-tracking. Cohérence stricte avec
 * la sidebar des maquettes (voir docs/design-system/mockups/).
 *
 * L'icône représente une courbe ascendante (graph) — symbole de
 * progression financière, en ligne avec la promesse produit "ton
 * argent / patrimoine / objectifs progressent".
 */

interface BrandMarkProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showWordmark?: boolean;
}

export function BrandMark({
  href = "/",
  size = "md",
  className,
  showWordmark = true,
}: BrandMarkProps) {
  // Phase 5.0 S3.1 v2 — wordmark plus présent dans la sidebar
  // (feedback "logo plus présent"). Le `md` (sidebar par défaut)
  // passe à `text-base` (16px) + tracking renforcé.
  const sizes = {
    sm: { box: "h-7 w-7", text: "text-sm tracking-[0.18em]" },
    md: { box: "h-9 w-9", text: "text-base tracking-[0.24em]" },
    lg: { box: "h-10 w-10", text: "text-lg tracking-[0.24em]" },
  } as const;

  const s = sizes[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-lg",
          "bg-navy",
          s.box,
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-1/2 w-1/2 text-navy-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 20V6" />
          <path d="M4 20h14" />
          <path d="M8 14l4-4 3 3 5-6" />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-semibold uppercase text-navy",
            s.text,
          )}
        >
          LIBERIA
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="LIBERIA, page d'accueil">
      {content}
    </Link>
  );
}
