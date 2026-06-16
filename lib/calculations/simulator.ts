/**
 * Sprint Iris V4 — calculs financiers déterministes pour le mode
 * Simulateur. Toutes les formules sont closed-form (pas de Monte
 * Carlo) — output reproductible, testable.
 *
 * Les formules sont les versions standard pour intérêt composé +
 * annuité + amortissement. Le coach utilise l'output via l'endpoint
 * /api/finance/simulate plutôt que de "raisonner" lui-même sur
 * compound interest — élimine les hallucinations sur les chiffres.
 */

const MONTHS_PER_YEAR = 12;

/**
 * Future value of a series of monthly contributions, compounded
 * monthly at an annual rate.
 *
 *   FV = PMT * ((1 + r)^n - 1) / r + PV * (1 + r)^n
 *
 * where r = annualRate / 12, n = months.
 */
export function futureValueMonthlyContributions(input: {
  initialAmount: number;
  monthlyContribution: number;
  annualReturnRate: number; // e.g. 0.05 for 5%
  durationYears: number;
}): {
  finalValue: number;
  totalContributed: number;
  totalReturn: number;
} {
  const { initialAmount, monthlyContribution, annualReturnRate, durationYears } =
    input;
  const months = Math.round(durationYears * MONTHS_PER_YEAR);
  const r = annualReturnRate / MONTHS_PER_YEAR;
  const pow = Math.pow(1 + r, months);
  const fvContributions =
    r === 0 ? monthlyContribution * months : monthlyContribution * ((pow - 1) / r);
  const fvInitial = initialAmount * pow;
  const finalValue = fvInitial + fvContributions;
  const totalContributed = initialAmount + monthlyContribution * months;
  return {
    finalValue: round2(finalValue),
    totalContributed: round2(totalContributed),
    totalReturn: round2(finalValue - totalContributed),
  };
}

/**
 * Required monthly contribution to reach a target amount over a
 * given duration at a given annual return rate.
 *
 *   PMT = target / (((1 + r)^n - 1) / r)   (assuming no PV)
 *
 * With PV (initial amount), we subtract its future value first.
 */
export function monthlyContributionForTarget(input: {
  targetAmount: number;
  initialAmount: number;
  annualReturnRate: number;
  durationYears: number;
}): { monthlyContribution: number; reachable: boolean } {
  const { targetAmount, initialAmount, annualReturnRate, durationYears } = input;
  const months = Math.round(durationYears * MONTHS_PER_YEAR);
  const r = annualReturnRate / MONTHS_PER_YEAR;
  const pow = Math.pow(1 + r, months);
  const fvOfInitial = initialAmount * pow;
  const remainder = targetAmount - fvOfInitial;
  if (remainder <= 0) return { monthlyContribution: 0, reachable: true };
  const denom = r === 0 ? months : (pow - 1) / r;
  const pmt = remainder / denom;
  return {
    monthlyContribution: round2(pmt),
    reachable: Number.isFinite(pmt) && pmt > 0,
  };
}

/**
 * Mortgage amortization — fixed-rate annuity (constant payment).
 *
 *   PMT = P * r / (1 - (1 + r)^-n)
 *
 * Returns monthly payment + total interest paid over the loan.
 * Variant "indirect amortization" CH (pillar 3a) keeps capital
 * constant — we model that with a flat interest payment instead.
 */
export function mortgagePayment(input: {
  principal: number;
  annualInterestRate: number;
  durationYears: number;
  amortizationMode?: "direct" | "indirect" | "interest_only";
}): {
  monthlyPayment: number;
  totalInterest: number;
  monthlyInterestOnly: number;
} {
  const { principal, annualInterestRate, durationYears } = input;
  const mode = input.amortizationMode ?? "direct";
  const months = Math.round(durationYears * MONTHS_PER_YEAR);
  const r = annualInterestRate / MONTHS_PER_YEAR;

  const monthlyInterestOnly = round2(principal * r);

  if (mode === "interest_only") {
    return {
      monthlyPayment: monthlyInterestOnly,
      totalInterest: round2(monthlyInterestOnly * months),
      monthlyInterestOnly,
    };
  }
  if (mode === "indirect") {
    // CH practice: the borrower pays the bank only the interest, and
    // contributes to a 3a account that will pay back the principal at
    // the end. From a cashflow standpoint here we report the same
    // monthly payment but flag it via monthlyInterestOnly.
    return {
      monthlyPayment: monthlyInterestOnly,
      totalInterest: round2(monthlyInterestOnly * months),
      monthlyInterestOnly,
    };
  }
  // direct amortization
  const pmt =
    r === 0
      ? principal / months
      : (principal * r) / (1 - Math.pow(1 + r, -months));
  const total = pmt * months;
  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(total - principal),
    monthlyInterestOnly,
  };
}

/**
 * Real (inflation-adjusted) future value.
 *
 *   FV_real = FV_nominal / (1 + i)^t
 */
export function inflationAdjusted(
  nominalValue: number,
  inflationRate: number,
  years: number,
): number {
  if (years <= 0) return round2(nominalValue);
  const factor = Math.pow(1 + inflationRate, years);
  return round2(nominalValue / factor);
}

/**
 * Runway projection — how many months the user can sustain current
 * burn rate from current savings. Returns null if cashflow is
 * positive (infinite runway).
 */
export function runwayMonths(
  currentSavings: number,
  monthlyBurn: number,
): number | null {
  if (monthlyBurn <= 0) return null;
  return round2(currentSavings / monthlyBurn);
}

/**
 * Debt payoff schedule — months needed to clear `principal` paying
 * `monthlyPayment` against `annualInterestRate`.
 */
export function debtPayoffMonths(input: {
  principal: number;
  monthlyPayment: number;
  annualInterestRate: number;
}): { months: number; totalInterest: number } | null {
  const { principal, monthlyPayment, annualInterestRate } = input;
  if (monthlyPayment <= 0) return null;
  const r = annualInterestRate / MONTHS_PER_YEAR;
  if (r === 0) {
    const months = Math.ceil(principal / monthlyPayment);
    return { months, totalInterest: 0 };
  }
  // Monthly interest must be less than payment, else debt grows.
  if (principal * r >= monthlyPayment) return null;
  // n = -log(1 - P*r/PMT) / log(1+r)
  const months = Math.ceil(
    -Math.log(1 - (principal * r) / monthlyPayment) / Math.log(1 + r),
  );
  const totalPaid = months * monthlyPayment;
  return { months, totalInterest: round2(totalPaid - principal) };
}

/**
 * 3 scenarios for goal planning. Used by /api/finance/simulate when
 * the coach asks "comment atteindre 100k en 10 ans".
 */
export function planScenarios(input: {
  targetAmount: number;
  initialAmount: number;
  durationYears: number;
}): {
  prudent: ScenarioOutput;
  balanced: ScenarioOutput;
  ambitious: ScenarioOutput;
} {
  const PRUDENT_RATE = 0.015; // 1.5% — savings account / 3a inflation-tracking
  const BALANCED_RATE = 0.04; // 4% — balanced 50/50 long term
  const AMBITIOUS_RATE = 0.07; // 7% — global equity historical real return

  const build = (rate: number): ScenarioOutput => {
    const m = monthlyContributionForTarget({
      targetAmount: input.targetAmount,
      initialAmount: input.initialAmount,
      annualReturnRate: rate,
      durationYears: input.durationYears,
    });
    const fv = futureValueMonthlyContributions({
      initialAmount: input.initialAmount,
      monthlyContribution: m.monthlyContribution,
      annualReturnRate: rate,
      durationYears: input.durationYears,
    });
    return {
      annualReturnRate: rate,
      monthlyContribution: m.monthlyContribution,
      finalValue: fv.finalValue,
      totalContributed: fv.totalContributed,
      totalReturn: fv.totalReturn,
    };
  };

  return {
    prudent: build(PRUDENT_RATE),
    balanced: build(BALANCED_RATE),
    ambitious: build(AMBITIOUS_RATE),
  };
}

export type ScenarioOutput = {
  annualReturnRate: number;
  monthlyContribution: number;
  finalValue: number;
  totalContributed: number;
  totalReturn: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
