/**
 * Phase 5.0 S3.1 — connecteur SVG entre 2 jalons de la roadmap.
 *
 * Reproduit la signature visuelle de la maquette : ligne pointillée
 * horizontale avec une flèche à droite (sens du temps). Plus de
 * `ChevronRight` Lucide générique — c'est l'élément qui transforme
 * "4 cartes alignées" en "voyage temporel".
 *
 * Pur SVG, aucune dépendance. Le composant prend toute la largeur
 * de sa colonne grid via `w-full`.
 *
 * Affiché uniquement sur `lg+` (la roadmap verticalise sur mobile,
 * pas de connecteur nécessaire).
 */

export function RoadmapConnector() {
  return (
    <li
      aria-hidden
      className="hidden items-center justify-center lg:col-span-1 lg:flex"
    >
      <svg
        viewBox="0 0 60 12"
        className="h-3 w-full text-muted-foreground/50"
        preserveAspectRatio="none"
      >
        {/* Ligne pointillée — signature maquette */}
        <line
          x1="2"
          y1="6"
          x2="48"
          y2="6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />
        {/* Tête de flèche droite */}
        <path
          d="M 48 2 L 56 6 L 48 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </li>
  );
}
