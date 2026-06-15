/**
 * Phase 5.0 S3.1 v8 — connecteur SVG entre 2 jalons de la roadmap.
 *
 * Re-calibration sur maquette stricte :
 *   - Lignes DASHED bleues (pas solides, pas grises)
 *   - Stroke 2 (présent mais élégant)
 *   - Couleur primary/50 (bleu visible mais pas saturé)
 *   - Tête de flèche assortie, légèrement épaisse
 *   - Largeur 36 px (jalons proches mais avec une vraie séparation visuelle)
 *
 * Maquette dashboard.png montre clairement des lignes pointillées
 * bleues + flèches qui RELIENT visuellement les milestones en une
 * timeline. Mes itérations v3-v7 alternaient entre invisible et
 * solide thick — v8 revient strictement à ce que la maquette montre.
 *
 * Pur SVG. Affiché uniquement `lg+`.
 */

export function RoadmapConnector() {
  return (
    <li
      aria-hidden
      className="hidden shrink-0 items-center justify-center self-center lg:flex"
      style={{ width: 36, height: 22 }}
    >
      <svg
        viewBox="0 0 36 12"
        className="h-3 w-full text-primary/50"
        preserveAspectRatio="none"
      >
        {/* Ligne pointillée bleue visible (signature maquette) */}
        <line
          x1="2"
          y1="6"
          x2="25"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />
        {/* Tête de flèche assortie */}
        <path
          d="M 26 1.5 L 33 6 L 26 10.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </li>
  );
}
