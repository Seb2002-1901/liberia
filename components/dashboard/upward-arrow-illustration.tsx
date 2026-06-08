/**
 * Phase 5.0 S3.1 — illustration flèche verte courbée montante.
 *
 * Reproduction maquette dashboard.png : la carte "Opportunité du
 * moment" comporte à droite une flèche stylisée qui monte de la
 * gauche-bas vers la droite-haut, suggérant la croissance des
 * revenus. C'est l'élément qui transforme le bloc en promesse
 * visuelle.
 *
 * Pur SVG, aucune dépendance. La couleur est `text-success` héritée
 * via `currentColor` pour rester cohérente avec le thème vert
 * succès de la maquette.
 */

interface UpwardArrowIllustrationProps {
  className?: string;
}

export function UpwardArrowIllustration({
  className,
}: UpwardArrowIllustrationProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="none"
      aria-hidden
    >
      {/* Halo radial très diffus en arrière-plan pour donner du
          relief sans peser visuellement. */}
      <defs>
        <radialGradient id="upward-arrow-glow" cx="0.7" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="56" cy="24" r="32" fill="url(#upward-arrow-glow)" />

      {/* Courbe principale — arc montant de bas-gauche vers haut-droite */}
      <path
        d="M 10 64 Q 32 50 44 36 Q 56 22 68 14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tête de flèche */}
      <path
        d="M 60 12 L 70 12 L 70 22"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Petits accents — particules de croissance */}
      <circle cx="18" cy="60" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="34" cy="48" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="50" cy="32" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
