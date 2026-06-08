/**
 * Phase 5.0 S3.1 v5 — connecteur SVG entre 2 jalons de la roadmap.
 *
 * Feedback v4 :
 *   - "diminuer l'impact visuel des flèches"
 *   - "renforcer l'effet timeline continue"
 *   - "rapprocher d'un seul composant cohérent"
 *
 * Itération v5 :
 *   - Stroke 2.5 → 1.75 (flèches discrètes)
 *   - Couleur primary/55 → primary/35 (moins saturé, plus intégré)
 *   - Largeur 56 → 40 px (jalons rapprochés)
 *   - Lignes continues (solides, déjà v4)
 *
 * Pur SVG. Affiché uniquement `lg+`.
 */

export function RoadmapConnector() {
  return (
    <li
      aria-hidden
      className="hidden shrink-0 items-center justify-center self-center lg:flex"
      style={{ width: 40, height: 24 }}
    >
      <svg
        viewBox="0 0 40 12"
        className="h-3 w-full text-primary/35"
        preserveAspectRatio="none"
      >
        {/* Ligne solide bleue discrète */}
        <line
          x1="2"
          y1="6"
          x2="29"
          y2="6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        {/* Tête de flèche assortie */}
        <path
          d="M 30 2 L 37 6 L 30 10"
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
