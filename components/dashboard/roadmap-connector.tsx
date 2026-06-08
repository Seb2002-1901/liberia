/**
 * Phase 5.0 S3.1 v4 — connecteur SVG entre 2 jalons de la roadmap.
 *
 * Feedback v3 : "connecteurs bleu foncé visibles, plus épais,
 * continus" — ligne SOLIDE (plus de dashes), couleur primary
 * marquée, stroke épais.
 *
 * Itération v4 :
 *   - Couleur primary/45 → primary/55 (plus saturé, plus visible)
 *   - Stroke 1.75 → 2.5 (ligne + flèche bien marquées)
 *   - Lignes solides (dasharray retiré — continues)
 *   - Largeur 48 → 56 px
 *
 * Pur SVG. Affiché uniquement `lg+`.
 */

export function RoadmapConnector() {
  return (
    <li
      aria-hidden
      className="hidden shrink-0 items-center justify-center self-center lg:flex"
      style={{ width: 56, height: 28 }}
    >
      <svg
        viewBox="0 0 56 12"
        className="h-3 w-full text-primary/55"
        preserveAspectRatio="none"
      >
        {/* Ligne solide bleue (continues, plus épaisse) */}
        <line
          x1="2"
          y1="6"
          x2="42"
          y2="6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Tête de flèche bleue, épaisse pour matcher la ligne */}
        <path
          d="M 43 1 L 53 6 L 43 11"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </li>
  );
}
