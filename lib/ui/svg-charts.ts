/**
 * Phase 5.0 S3 — primitives SVG pour donut + line chart.
 *
 * Décision produit (Q5 validée) : SVG fait-main, aucune dépendance
 * (recharts ~50 kB évité). Contrôle pixel-perfect sur l'arc donut
 * et la courbe d'évolution. Suffisant pour les 2 charts du
 * dashboard.
 *
 * Pur, déterministe, testable. Aucun composant React ici — juste
 * des helpers qui calculent des `d="…"` SVG. Les composants UI
 * importent ces helpers et rendent les `<path>` avec leur propre
 * styling Tailwind.
 */

/* -------------------------------------------------------------------------- */
/*  Donut chart                                                                */
/* -------------------------------------------------------------------------- */

export interface DonutSegment {
  /** Identifiant logique du segment (catégorie, axe…). */
  id: string;
  /** Valeur absolue. Les pourcentages sont calculés à partir du total. */
  value: number;
}

export interface DonutSlice {
  id: string;
  value: number;
  /** Pourcentage (0-100) arrondi à 1 décimale. */
  percent: number;
  /** Attribut `d` complet pour le <path> SVG. */
  pathD: string;
  /** Angles de départ/fin pour debug. */
  startAngle: number;
  endAngle: number;
}

export interface DonutOptions {
  /** Demi-largeur du viewBox SVG. Par défaut 50 → viewBox 0 0 100 100. */
  cx?: number;
  cy?: number;
  /** Rayon externe en unités viewBox. Par défaut 45. */
  radius?: number;
  /** Largeur du trou central en unités viewBox. Par défaut 18 (~40% du r). */
  thickness?: number;
  /** Espace en degrés entre 2 segments (séparateurs blancs). Par défaut 1°. */
  gapDeg?: number;
  /** Angle de départ. 0 = nord (12h). Par défaut -90 (-> 12h). */
  startAtDeg?: number;
}

const DEFAULTS: Required<DonutOptions> = {
  cx: 50,
  cy: 50,
  radius: 45,
  thickness: 18,
  gapDeg: 1,
  startAtDeg: -90,
};

/**
 * Convertit un angle (degrés) + un rayon en point cartésien
 * (relatif au centre). 0° = est (3h), 90° = sud (6h), -90° = nord
 * (12h) — convention SVG/maths standard.
 */
function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Construit le `d` SVG d'un anneau (donut slice) entre deux angles.
 * Utilise 2 arcs : externe (sens trigo direct) + interne (sens
 * inverse), connectés par 2 lignes droites.
 */
function donutSliceD(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const startOuter = polarToCartesian(cx, cy, outerR, startDeg);
  const endOuter = polarToCartesian(cx, cy, outerR, endDeg);
  const startInner = polarToCartesian(cx, cy, innerR, endDeg);
  const endInner = polarToCartesian(cx, cy, innerR, startDeg);
  return [
    `M ${startOuter.x.toFixed(3)} ${startOuter.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x.toFixed(3)} ${endOuter.y.toFixed(3)}`,
    `L ${startInner.x.toFixed(3)} ${startInner.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x.toFixed(3)} ${endInner.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

/**
 * Construit la liste des slices à rendre depuis un tableau de
 * segments. Les segments à valeur nulle ou négative sont écartés.
 * Si tous les segments sont 0, on renvoie un tableau vide (le
 * composant UI affichera son empty state).
 */
export function buildDonutSlices(
  segments: DonutSegment[],
  options: DonutOptions = {},
): DonutSlice[] {
  const opts = { ...DEFAULTS, ...options };
  const usable = segments.filter((s) => s.value > 0);
  const total = usable.reduce((s, x) => s + x.value, 0);
  if (total === 0) return [];

  const innerR = Math.max(0, opts.radius - opts.thickness);
  const gap = usable.length > 1 ? opts.gapDeg : 0;
  const totalGap = gap * usable.length;
  const usableDeg = 360 - totalGap;

  let cursor = opts.startAtDeg;
  const out: DonutSlice[] = [];

  for (const seg of usable) {
    const share = seg.value / total;
    const sweep = usableDeg * share;
    const startDeg = cursor;
    const endDeg = cursor + sweep;
    out.push({
      id: seg.id,
      value: seg.value,
      percent: Math.round((share * 100) * 10) / 10,
      pathD: donutSliceD(opts.cx, opts.cy, opts.radius, innerR, startDeg, endDeg),
      startAngle: startDeg,
      endAngle: endDeg,
    });
    cursor = endDeg + gap;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Ring (single arc — used by Score donut on navy card)                       */
/* -------------------------------------------------------------------------- */

export interface ProgressRing {
  /** Cercle de fond complet (track). */
  trackD: string;
  /** Arc de progression (partiel). */
  arcD: string;
  /** Longueur d'arc en degrés. */
  sweepDeg: number;
}

/**
 * Génère le path d'un anneau de progression (utilisé par la
 * Score Card pour reproduire le donut blanc partiel de la maquette).
 *
 * `progress` ∈ [0, 1]. cx/cy/r/thickness en unités viewBox.
 */
export function buildProgressRing(
  progress: number,
  options: { cx?: number; cy?: number; radius?: number; thickness?: number } = {},
): ProgressRing {
  const cx = options.cx ?? 50;
  const cy = options.cy ?? 50;
  const r = options.radius ?? 42;
  const thick = options.thickness ?? 8;
  const innerR = r - thick;
  const clamped = Math.max(0, Math.min(1, progress));
  const sweepDeg = clamped * 360;

  // Track : cercle complet en 2 arcs (un seul `A` ne peut pas faire
  // 360° en SVG, on coupe en 2 arcs de 180°).
  const trackD = [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 1 1 ${cx} ${cy + r}`,
    `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
    `M ${cx} ${cy - innerR}`,
    `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR}`,
    `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
  ].join(" ");

  if (sweepDeg <= 0) {
    return { trackD, arcD: "", sweepDeg };
  }
  const arcD = donutSliceD(cx, cy, r, innerR, -90, -90 + sweepDeg);
  return { trackD, arcD, sweepDeg };
}

/* -------------------------------------------------------------------------- */
/*  Line chart                                                                 */
/* -------------------------------------------------------------------------- */

export interface LineChartPoint {
  /** Identifiant logique (ex. ISO week, date string). */
  id: string;
  /** Valeur Y. */
  value: number;
}

export interface LineChartRendered {
  /** Path `d` de la courbe (linear). */
  pathD: string;
  /** Path `d` de l'aire sous courbe (peut être vide si height=0). */
  areaD: string;
  /** Points cartésiens (cx,cy) pour afficher les puces. */
  points: Array<{ id: string; x: number; y: number; value: number }>;
  /** Min/max effectifs utilisés pour l'échelle Y. */
  yMin: number;
  yMax: number;
}

export interface LineChartOptions {
  /** Largeur du viewBox SVG. Par défaut 300. */
  width?: number;
  /** Hauteur du viewBox SVG. Par défaut 100. */
  height?: number;
  /** Marges intérieures (laisse de la place aux puces). */
  padding?: { top: number; right: number; bottom: number; left: number };
  /** Borne Y min/max forcée. Si omis, calculé depuis les valeurs. */
  yMin?: number;
  yMax?: number;
}

/**
 * Calcule les coordonnées SVG d'un line chart simple linéaire.
 * Retourne le path de la courbe, le path de l'aire (pour halo
 * sous courbe), les points et les bornes Y effectives.
 *
 * Si `points` est vide ou contient 1 seul point, on renvoie
 * pathD="" + areaD="" + points=[…]. Le composant UI affiche son
 * empty state dans ce cas.
 */
export function buildLineChart(
  points: LineChartPoint[],
  options: LineChartOptions = {},
): LineChartRendered {
  const width = options.width ?? 300;
  const height = options.height ?? 100;
  const pad = options.padding ?? { top: 8, right: 8, bottom: 16, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (points.length === 0) {
    return { pathD: "", areaD: "", points: [], yMin: 0, yMax: 0 };
  }

  const values = points.map((p) => p.value);
  const yMin = options.yMin ?? Math.min(...values);
  const yMax = options.yMax ?? Math.max(...values);
  const yRange = yMax - yMin || 1; // évite la division par 0 sur valeurs constantes

  const scaledPoints = points.map((p, i) => {
    const x = pad.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
    const y = pad.top + innerH - ((p.value - yMin) / yRange) * innerH;
    return { id: p.id, x, y, value: p.value };
  });

  if (scaledPoints.length === 1) {
    // Pas de ligne — un seul point. On le retourne quand même
    // pour que le composant puisse afficher le dot + son empty
    // state pédagogique "Reviens la semaine prochaine".
    return {
      pathD: "",
      areaD: "",
      points: scaledPoints,
      yMin,
      yMax,
    };
  }

  const pathD = scaledPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const first = scaledPoints[0];
  const last = scaledPoints[scaledPoints.length - 1];
  const baselineY = pad.top + innerH;
  const areaD = `${pathD} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;

  return { pathD, areaD, points: scaledPoints, yMin, yMax };
}
