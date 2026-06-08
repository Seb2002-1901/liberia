/**
 * Phase 5.0 S3.1 v2 — connecteur SVG entre 2 jalons de la roadmap.
 *
 * Itération maquette stricte : ligne pointillée fine + petite tête
 * de flèche, occupant une largeur fixe modeste (40 px) plutôt
 * qu'une colonne grid pleine — les jalons doivent dominer
 * visuellement, pas les connecteurs.
 *
 * Pur SVG, aucune dépendance. Affiché uniquement `lg+`.
 */

export function RoadmapConnector() {
  return (
    <li
      aria-hidden
      className="hidden shrink-0 items-center justify-center self-center lg:flex"
      style={{ width: 40, height: 24 }}
    >
      <svg
        viewBox="0 0 40 10"
        className="h-2.5 w-full text-muted-foreground/45"
        preserveAspectRatio="none"
      >
        {/* Ligne pointillée fine */}
        <line
          x1="2"
          y1="5"
          x2="30"
          y2="5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeDasharray="1.5 3"
        />
        {/* Tête de flèche petite */}
        <path
          d="M 31 1.5 L 37 5 L 31 8.5"
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
