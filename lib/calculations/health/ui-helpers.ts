import { BAND_THRESHOLDS } from "./constants";
import type {
  AxisConfidence,
  Band,
  Confidence,
  HealthScoreResult,
  MomentumResult,
} from "./types";

/**
 * Phase 3.2 — UI presentation helpers.
 *
 * Pure functions that turn raw HealthScoreResult / DrawerData fields
 * into the visual primitives the Ring and Drawer components render
 * (colors, labels, deltas, arc fractions). Living here lets us TDD
 * the visual rules WITHOUT spinning up jsdom + React Testing
 * Library — components only consume the strings these functions
 * return.
 *
 * One concept = one function. Helpers compose cleanly in JSX.
 */

/* -------------------------------------------------------------------------- */
/*  Band metadata                                                              */
/* -------------------------------------------------------------------------- */

export interface BandTheme {
  /** Hex-like tailwind token for the progress arc. */
  arc: string;
  /** Background tone for the badge / pill. */
  badge: string;
  /** Neutralised palette when confidence is INSUFFICIENT_DATA. */
  neutral: boolean;
}

export function bandTheme(band: Band, confidence: Confidence): BandTheme {
  if (confidence === "INSUFFICIENT_DATA") {
    return {
      arc: "stroke-muted-foreground/40",
      badge: "bg-muted/40 text-muted-foreground",
      neutral: true,
    };
  }
  switch (band) {
    case "rose":
      return {
        arc: "stroke-rose-500",
        badge: "bg-rose-500/10 text-rose-500",
        neutral: false,
      };
    case "ambre":
      return {
        arc: "stroke-[hsl(var(--gold))]",
        badge: "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]",
        neutral: false,
      };
    case "or":
      return {
        arc: "stroke-emerald-500/80",
        badge: "bg-emerald-500/10 text-emerald-500",
        neutral: false,
      };
    case "emeraude":
      return {
        arc: "stroke-emerald-500",
        badge: "bg-emerald-500/15 text-emerald-600",
        neutral: false,
      };
  }
}

/**
 * Defensive band recompute — useful when the caller only has a score
 * and not the full HealthScoreResult (e.g. async loading state).
 */
export function bandFromScore(score: number): Band {
  if (score < BAND_THRESHOLDS[0]) return "rose";
  if (score < BAND_THRESHOLDS[1]) return "ambre";
  if (score < BAND_THRESHOLDS[2]) return "or";
  return "emeraude";
}

/* -------------------------------------------------------------------------- */
/*  Ring SVG geometry                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Compute the stroke-dashoffset for a circular progress arc given a
 * 0-100 score, a radius and a desired stroke. Returned values stay
 * stable across rerenders → no animation jitter.
 */
export function ringArcOffset(
  score: number,
  radius: number,
): { circumference: number; offset: number } {
  const c = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c - (clamped / 100) * c;
  return { circumference: c, offset };
}

/* -------------------------------------------------------------------------- */
/*  Delta chip formatting                                                      */
/* -------------------------------------------------------------------------- */

export type DeltaSign = "POSITIVE" | "NEGATIVE" | "STABLE" | "ABSENT";

export function classifyDelta(delta: number | null): DeltaSign {
  if (delta === null) return "ABSENT";
  if (delta > 0) return "POSITIVE";
  if (delta < 0) return "NEGATIVE";
  return "STABLE";
}

/**
 * Render-ready delta string. Always integer, never decimal — per Q7
 * of the calibration arbitration.
 *
 *   POSITIVE → "+2"
 *   NEGATIVE → "−1" (unicode minus, not hyphen)
 *   STABLE   → "—" (em-dash)
 *   ABSENT   → null (caller renders nothing or "•" for first-snapshot)
 */
export function formatDelta(delta: number | null): string | null {
  const sign = classifyDelta(delta);
  switch (sign) {
    case "POSITIVE":
      return `+${delta}`;
    case "NEGATIVE":
      return `−${Math.abs(delta as number)}`;
    case "STABLE":
      return "—";
    case "ABSENT":
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Momentum chip                                                              */
/* -------------------------------------------------------------------------- */

/**
 * UI-ready momentum description : an arrow glyph + a copy key the
 * drawer translates. STRONG MEDIUM WEAK FOLD into the strength
 * adjective (see i18n).
 */
export interface MomentumChip {
  glyph: "↗" | "↘" | "→";
  directionKey: "directionUP" | "directionDOWN" | "directionFLAT";
  strengthKey: "strengthWEAK" | "strengthMEDIUM" | "strengthSTRONG";
  weeks: number;
}

export function momentumChip(m: MomentumResult | null): MomentumChip | null {
  if (!m) return null;
  return {
    glyph: m.direction === "UP" ? "↗" : m.direction === "DOWN" ? "↘" : "→",
    directionKey:
      m.direction === "UP"
        ? "directionUP"
        : m.direction === "DOWN"
          ? "directionDOWN"
          : "directionFLAT",
    strengthKey:
      m.strength === "WEAK"
        ? "strengthWEAK"
        : m.strength === "MEDIUM"
          ? "strengthMEDIUM"
          : "strengthSTRONG",
    weeks: m.windowSize,
  };
}

/* -------------------------------------------------------------------------- */
/*  Confidence pill                                                            */
/* -------------------------------------------------------------------------- */

/** Tone for the confidence badge — INSUFFICIENT_DATA stays NEUTRAL,
    NOT rose, to avoid the "bad grade" feeling. */
export function confidencePillTone(c: Confidence): string {
  switch (c) {
    case "HIGH":
      return "bg-emerald-500/10 text-emerald-600";
    case "MEDIUM":
      return "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]";
    case "LOW":
      return "bg-rose-500/10 text-rose-500";
    case "INSUFFICIENT_DATA":
      return "bg-muted text-muted-foreground";
  }
}

/* -------------------------------------------------------------------------- */
/*  Axis row rendering                                                         */
/* -------------------------------------------------------------------------- */

/** Bar fill width as a 0..100 number for the Progress component. */
export function axisBarPct(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Bar tone — matches axis confidence + relative position. */
export function axisBarTone(score: number, confidence: AxisConfidence): string {
  if (confidence === "UNKNOWN") {
    return "bg-muted-foreground/30";
  }
  if (score < 40) return "bg-rose-500/70";
  if (score < 65) return "bg-[hsl(var(--gold))]";
  return "bg-emerald-500/80";
}

/* -------------------------------------------------------------------------- */
/*  Drawer header convenience                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Pick the canonical previous score the drawer cites in its delta
 * block ("Score semaine dernière : 68 → cette semaine : 71"). Uses
 * the snapshot's denormalised previousScore field. Returns null when
 * the user has no previous (first snapshot).
 */
export function previousScoreFor(score: HealthScoreResult): number | null {
  return score.previousScore;
}
