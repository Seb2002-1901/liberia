/**
 * Phase 5.0 S3.1 v3 — connecteur SVG entre 2 jalons de la roadmap.
 *
 * Feedback v2 : "Revenir à une ligne bleue plus proche de la maquette.
 * Les flèches doivent être légèrement plus épaisses."
 *
 * Itération v3 :
 *   - Couleur passée de muted-foreground (gris) à primary/35 (bleu)
 *   - Stroke 1.25 → 1.75 (lignes + flèches plus présentes)
 *   - Largeur du composant 40px → 48px (plus de respiration)
 *   - Tête de flèche légèrement agrandie
 *
 * Pur SVG, aucune dépendance. Affiché uniquement `lg+`.
 */

export function RoadmapConnector() {
  return (
    <li
      aria-hidden
      className="hidden shrink-0 items-center justify-center self-center lg:flex"
      style={{ width: 48, height: 28 }}
    >
      <svg
        viewBox="0 0 48 12"
        className="h-3 w-full text-primary/40"
        preserveAspectRatio="none"
      >
        {/* Ligne pointillée bleue plus visible */}
        <line
          x1="2"
          y1="6"
          x2="36"
          y2="6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />
        {/* Tête de flèche bleue, légèrement plus épaisse */}
        <path
          d="M 37 1.5 L 45 6 L 37 10.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </li>
  );
}
