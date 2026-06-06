import { clamp, roundInt } from "../utils";
import type { AxisConfidence, AxisResult } from "../types";

/**
 * Phase 3.2 — Axis 4 : Couverture (weight 15 %).
 *
 * Rewards profile completeness. The richer the declared data, the
 * deeper the analysis the rest of LIBERIA can run.
 *
 * Pure projection of completeness.structurelle, with two non-numeric
 * details that let the delta engine say "Logement renseigné" rather
 * than the generic "Profil affiné" :
 *
 *   details.filled_majors  = string[] — areas currently filled
 *   details.missing_majors = string[] — areas currently missing
 */

export interface CouvertureInput {
  /** completeness.structurelle 0-100, already computed by the
   *  existing financial-completeness primitive. */
  structurelle: number;
  /** List of MAJOR area ids the user has declared (income, housing,
   *  insurance, food, transport, …). Used by the delta engine to
   *  detect newly-added or newly-missing areas. */
  filledMajorAreas: readonly string[];
  /** List of MAJOR area ids still missing — same ordering, same
   *  vocabulary as filledMajorAreas (mutually exclusive subsets of
   *  the canonical area list). */
  missingMajorAreas: readonly string[];
}

export function computeCouverture(input: CouvertureInput): AxisResult {
  const { structurelle, filledMajorAreas, missingMajorAreas } = input;

  // Empty profile : structurelle 0 maps cleanly to score 0 ; we still
  // report confidence HIGH because completeness measures itself with
  // certainty — the "low" tier here is the SCORE, not the certainty.
  const score = clamp(roundInt(structurelle), 0, 100);

  return {
    id: "couverture",
    score,
    confidence: resolveConfidence(filledMajorAreas.length),
    components: {
      structurelle: roundInt(structurelle),
      filled_majors_count: filledMajorAreas.length,
      missing_majors_count: missingMajorAreas.length,
    },
    details: {
      filled_majors: [...filledMajorAreas],
      missing_majors: [...missingMajorAreas],
    },
  };
}

/**
 * Couverture measures itself, so it never returns UNKNOWN. A brand
 * new account just gets a low score with HIGH confidence — the score
 * is honest, the confidence is honest.
 *
 * The exception : when not a single major area is filled we drop to
 * MEDIUM, signalling "we know almost nothing about you yet — keep
 * going".
 */
function resolveConfidence(filledCount: number): AxisConfidence {
  if (filledCount === 0) return "MEDIUM";
  return "HIGH";
}
