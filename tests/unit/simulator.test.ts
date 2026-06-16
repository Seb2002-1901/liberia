import { describe, it, expect } from "vitest";
import {
  futureValueMonthlyContributions,
  monthlyContributionForTarget,
  mortgagePayment,
  inflationAdjusted,
  runwayMonths,
  debtPayoffMonths,
  planScenarios,
} from "@/lib/calculations/simulator";

/**
 * Sprint Iris V4 — formules financières déterministes. Le but est
 * d'éliminer les hallucinations LLM sur les chiffres composés. On
 * vérifie les valeurs contre des calculs externes (HP-12C / Excel).
 */

describe("futureValueMonthlyContributions", () => {
  it("zero rate: linear accumulation + initial", () => {
    const r = futureValueMonthlyContributions({
      initialAmount: 1000,
      monthlyContribution: 100,
      annualReturnRate: 0,
      durationYears: 10,
    });
    // 1000 + 100*120 = 13000
    expect(r.finalValue).toBe(13000);
    expect(r.totalContributed).toBe(13000);
    expect(r.totalReturn).toBe(0);
  });

  it("5% over 30 years, 500/mo, no initial — classic FIRE example", () => {
    const r = futureValueMonthlyContributions({
      initialAmount: 0,
      monthlyContribution: 500,
      annualReturnRate: 0.05,
      durationYears: 30,
    });
    // Excel FV(5%/12, 360, -500, 0) ≈ 416_129.32
    expect(r.finalValue).toBeGreaterThan(415_000);
    expect(r.finalValue).toBeLessThan(417_500);
    expect(r.totalContributed).toBe(180_000);
  });

  it("with initial amount", () => {
    const r = futureValueMonthlyContributions({
      initialAmount: 10_000,
      monthlyContribution: 200,
      annualReturnRate: 0.04,
      durationYears: 20,
    });
    // Excel FV(4%/12, 240, -200, -10000) ≈ 95_416
    expect(r.finalValue).toBeGreaterThan(94_500);
    expect(r.finalValue).toBeLessThan(96_500);
  });
});

describe("monthlyContributionForTarget", () => {
  it("zero rate: target / months", () => {
    const r = monthlyContributionForTarget({
      targetAmount: 12_000,
      initialAmount: 0,
      annualReturnRate: 0,
      durationYears: 1,
    });
    expect(r.monthlyContribution).toBe(1000);
    expect(r.reachable).toBe(true);
  });

  it("4% to reach 100k in 10 years", () => {
    const r = monthlyContributionForTarget({
      targetAmount: 100_000,
      initialAmount: 0,
      annualReturnRate: 0.04,
      durationYears: 10,
    });
    // Excel PMT(4%/12, 120, 0, -100000) ≈ 678.96 (negative for outflow)
    expect(r.monthlyContribution).toBeGreaterThan(675);
    expect(r.monthlyContribution).toBeLessThan(685);
    expect(r.reachable).toBe(true);
  });

  it("initial covers target → no contribution needed", () => {
    const r = monthlyContributionForTarget({
      targetAmount: 100,
      initialAmount: 1000,
      annualReturnRate: 0.05,
      durationYears: 5,
    });
    expect(r.monthlyContribution).toBe(0);
    expect(r.reachable).toBe(true);
  });
});

describe("mortgagePayment", () => {
  it("direct amortization: classic annuity formula", () => {
    const r = mortgagePayment({
      principal: 500_000,
      annualInterestRate: 0.03,
      durationYears: 25,
      amortizationMode: "direct",
    });
    // Excel PMT(3%/12, 300, -500000) ≈ 2_370.95
    expect(r.monthlyPayment).toBeGreaterThan(2350);
    expect(r.monthlyPayment).toBeLessThan(2400);
    expect(r.totalInterest).toBeGreaterThan(200_000);
  });

  it("interest_only mode: just monthly interest", () => {
    const r = mortgagePayment({
      principal: 500_000,
      annualInterestRate: 0.024,
      durationYears: 25,
      amortizationMode: "interest_only",
    });
    // 500_000 * 0.024 / 12 = 1000 CHF/mo
    expect(r.monthlyPayment).toBe(1000);
    expect(r.monthlyInterestOnly).toBe(1000);
  });

  it("indirect (CH practice): same as interest only on cashflow", () => {
    const r = mortgagePayment({
      principal: 800_000,
      annualInterestRate: 0.018,
      durationYears: 30,
      amortizationMode: "indirect",
    });
    // 800_000 * 0.018 / 12 = 1200 CHF/mo interest, 3a side separate
    expect(r.monthlyPayment).toBe(1200);
  });
});

describe("inflationAdjusted", () => {
  it("2% inflation, 100k in 30 years → ~55k real", () => {
    const real = inflationAdjusted(100_000, 0.02, 30);
    // 100_000 / 1.02^30 ≈ 55_207
    expect(real).toBeGreaterThan(54_500);
    expect(real).toBeLessThan(56_000);
  });

  it("0 inflation: identity", () => {
    expect(inflationAdjusted(50_000, 0, 20)).toBe(50_000);
  });

  it("0 years: identity", () => {
    expect(inflationAdjusted(123, 0.05, 0)).toBe(123);
  });
});

describe("runwayMonths", () => {
  it("classic runway division", () => {
    expect(runwayMonths(10_000, 2500)).toBe(4);
  });

  it("zero burn → infinite runway → null", () => {
    expect(runwayMonths(10_000, 0)).toBeNull();
  });
});

describe("debtPayoffMonths", () => {
  it("zero interest: ceil(P / PMT)", () => {
    const r = debtPayoffMonths({
      principal: 10_000,
      monthlyPayment: 500,
      annualInterestRate: 0,
    });
    expect(r?.months).toBe(20);
    expect(r?.totalInterest).toBe(0);
  });

  it("18% credit card: longer", () => {
    const r = debtPayoffMonths({
      principal: 10_000,
      monthlyPayment: 500,
      annualInterestRate: 0.18,
    });
    // Excel NPER(18%/12, -500, 10000) ≈ 24 months
    expect(r?.months).toBeGreaterThan(22);
    expect(r?.months).toBeLessThan(26);
    expect(r?.totalInterest).toBeGreaterThan(0);
  });

  it("payment too small to cover interest → null", () => {
    const r = debtPayoffMonths({
      principal: 10_000,
      monthlyPayment: 50,
      annualInterestRate: 0.18,
    });
    expect(r).toBeNull();
  });
});

describe("planScenarios", () => {
  it("100k in 10 years from 0 initial — three scenarios", () => {
    const s = planScenarios({
      targetAmount: 100_000,
      initialAmount: 0,
      durationYears: 10,
    });
    expect(s.prudent.annualReturnRate).toBe(0.015);
    expect(s.balanced.annualReturnRate).toBe(0.04);
    expect(s.ambitious.annualReturnRate).toBe(0.07);
    // Prudent demands a higher monthly contribution than ambitious
    expect(s.prudent.monthlyContribution).toBeGreaterThan(
      s.balanced.monthlyContribution,
    );
    expect(s.balanced.monthlyContribution).toBeGreaterThan(
      s.ambitious.monthlyContribution,
    );
    // All three reach roughly the target
    expect(s.prudent.finalValue).toBeGreaterThan(99_000);
    expect(s.balanced.finalValue).toBeGreaterThan(99_000);
    expect(s.ambitious.finalValue).toBeGreaterThan(99_000);
  });
});
