/**
 * Phase 5.0 S3.1 v3 — illustration flèche verte courbée montante.
 *
 * Feedback v2 : "Réduire légèrement la dominance visuelle de la
 * flèche verte. La rendre plus élégante. Plus proche de la
 * maquette."
 *
 * Itération v3 :
 *   - Stroke 3 → 2 (plus fine, plus aérienne)
 *   - Particules retirées (alourdissaient l'illustration)
 *   - Halo radial conservé mais opacité réduite (0.15 → 0.10)
 *   - Tête de flèche affinée, plus élégante
 *
 * Pur SVG. Couleur héritée via currentColor (`text-success` sur le
 * parent).
 */

interface UpwardArrowIllustrationProps {
  className?: string;
}

export function UpwardArrowIllustration({
  className,
}: UpwardArrowIllustrationProps) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="upward-arrow-glow" cx="0.7" cy="0.3" r="0.65">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.10" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="56" cy="24" r="32" fill="url(#upward-arrow-glow)" />

      {/* Courbe principale — arc montant. Phase 5.0 S3.1 v4 :
          stroke 2 → 2.75 pour matcher la présence maquette. */}
      <path
        d="M 10 64 Q 32 50 44 36 Q 56 22 68 14"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tête de flèche */}
      <path
        d="M 62 12 L 70 12 L 70 20"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
