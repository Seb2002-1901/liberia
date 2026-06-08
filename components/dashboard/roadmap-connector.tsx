/**
 * Phase 5.0 S3.1 v6 — connecteur SVG entre 2 jalons de la roadmap.
 *
 * Feedback v5 : "connecteurs plus fins, ressembler à la maquette
 * et non à des CTA". Continue de réduire la présence visuelle.
 *
 * Itération v6 :
 *   - Stroke 1.75 → 1.25 (lignes vraiment fines)
 *   - Couleur primary/35 → primary/30 (plus intégré, moins saturé)
 *   - Tête de flèche plus discrète
 *   - Largeur 40 → 32 px (jalons encore plus proches)
 *
 * Pur SVG. Affiché uniquement `lg+`.
 */

export function RoadmapConnector() {
  return (
    <li
      aria-hidden
      className="hidden shrink-0 items-center justify-center self-center lg:flex"
      style={{ width: 32, height: 20 }}
    >
      <svg
        viewBox="0 0 32 10"
        className="h-2.5 w-full text-primary/30"
        preserveAspectRatio="none"
      >
        {/* Ligne fine continue */}
        <line
          x1="2"
          y1="5"
          x2="22"
          y2="5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        {/* Tête de flèche discrète */}
        <path
          d="M 23 1.5 L 29 5 L 23 8.5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </li>
  );
}
