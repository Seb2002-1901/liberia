import { describe, expect, it } from "vitest";
import { generateLocalCoachReply } from "@/lib/coach/local";
import { deriveQuickPrompts } from "@/lib/coach/quick-prompts";
import type { FinancialProfile, UserMemory } from "@/types/database";

function makeProfile(
  overrides: Partial<FinancialProfile> = {},
): FinancialProfile {
  return {
    id: "fp-1",
    user_id: "u-1",
    situation: "tight",
    monthly_income: 2400,
    monthly_expenses: 2000,
    current_savings: 500,
    monthly_debt: 0,
    has_emergency_fund: false,
    main_goal: "emergency_fund",
    perceived_stress: 3,
    stability_score: 50,
    stress_score: 50,
    behavior_traits: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeMemory(overrides: Partial<UserMemory> = {}): UserMemory {
  return {
    id: "m-1",
    user_id: "u-1",
    coaching_tone: null,
    financial_personality: null,
    recurring_challenges: [],
    preferred_motivation_style: null,
    spending_triggers: [],
    progress_notes: null,
    last_coach_summary: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("generateLocalCoachReply — premium gate not bypassed", () => {
  it("returns a non-empty string for any user message", () => {
    const reply = generateLocalCoachReply({
      userMessage: "Bonjour",
      history: [],
      fullName: "Sébastien",
      financialProfile: makeProfile(),
      memory: makeMemory(),
      monthlyIncome: 2400,
      monthlyExpenses: 2000,
      currentSavings: 500,
      monthlyDebt: 0,
      currency: "CHF",
    });
    expect(reply.length).toBeGreaterThan(20);
    // Never reveals tech details.
    expect(reply).not.toMatch(/ANTHROPIC|API_KEY|env\.local/i);
  });

  it("does not produce NaN / undefined when inputs are zero", () => {
    const reply = generateLocalCoachReply({
      userMessage: "Que dois-je faire ?",
      history: [],
      fullName: null,
      financialProfile: null,
      memory: null,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      currentSavings: 0,
      monthlyDebt: 0,
      currency: "CHF",
    });
    // Word boundaries so French words like "fiNANcière" don't false-match.
    expect(reply).not.toMatch(/\bNaN\b|\bundefined\b|\bnull\b/i);
  });
});

describe("generateLocalCoachReply — tone adaptation", () => {
  const base = {
    userMessage: "Que dois-je faire cette semaine ?",
    history: [],
    fullName: "Sébastien",
    monthlyIncome: 3000,
    monthlyExpenses: 2800,
    currentSavings: 200,
    monthlyDebt: 0,
    currency: "CHF",
  };

  it("calm tone wraps with a gentle closing question", () => {
    const reply = generateLocalCoachReply({
      ...base,
      financialProfile: makeProfile({ behavior_traits: ["anxious"] }),
      memory: makeMemory({ coaching_tone: "calm" }),
    });
    expect(reply).toMatch(/creuse|rythme|tranquille|Tu veux/i);
  });

  it("direct tone is more action-oriented", () => {
    const reply = generateLocalCoachReply({
      ...base,
      financialProfile: makeProfile({ behavior_traits: ["motivated"] }),
      memory: makeMemory({ coaching_tone: "direct" }),
    });
    expect(reply).toMatch(/attaque|attaquer|action|premier verrou/i);
  });

  it("structured tone proposes step decomposition", () => {
    const reply = generateLocalCoachReply({
      ...base,
      financialProfile: makeProfile(),
      memory: makeMemory({ coaching_tone: "structured" }),
    });
    expect(reply).toMatch(/étape|détailler|découper|verrou/i);
  });
});

describe("generateLocalCoachReply — intent detection", () => {
  const base = {
    history: [],
    fullName: "Sam",
    financialProfile: makeProfile(),
    memory: makeMemory(),
    monthlyIncome: 3000,
    monthlyExpenses: 2200,
    currentSavings: 800,
    monthlyDebt: 0,
    currency: "CHF",
  };

  it("detects greeting", () => {
    const reply = generateLocalCoachReply({
      ...base,
      userMessage: "Salut",
    });
    expect(reply.toLowerCase()).toMatch(/salut|content/);
  });

  it("detects subscription intent", () => {
    const reply = generateLocalCoachReply({
      ...base,
      userMessage: "Comment couper mes abonnements ?",
    });
    expect(reply.toLowerCase()).toMatch(/abonnement|coupé|coupe/);
  });

  it("detects debt intent and uses DTI when relevant", () => {
    const reply = generateLocalCoachReply({
      ...base,
      financialProfile: makeProfile({ monthly_debt: 1200 }),
      monthlyDebt: 1200,
      monthlyIncome: 3000,
      userMessage: "Comment gérer ma dette ?",
    });
    expect(reply).toMatch(/40\s*%|dette|crédit/i);
  });
});

describe("deriveQuickPrompts — persona-aware suggestions", () => {
  it("returns cashflow-focused prompts when cashflow is negative", () => {
    const prompts = deriveQuickPrompts({
      financialProfile: makeProfile({ behavior_traits: [] }),
      memory: makeMemory(),
      monthlyIncome: 2000,
      monthlyExpenses: 2400,
      hasEmergencyFund: true,
    });
    expect(prompts.join(" ").toLowerCase()).toMatch(/écart|marge|souffler|réduire/);
  });

  it("returns debt-focused prompts when DTI is high", () => {
    const prompts = deriveQuickPrompts({
      financialProfile: makeProfile({ monthly_debt: 1200 }),
      memory: makeMemory(),
      monthlyIncome: 3000,
      monthlyExpenses: 2000,
      hasEmergencyFund: true,
    });
    expect(prompts.join(" ").toLowerCase()).toMatch(/crédit|dette|rembours/);
  });

  it("returns anxious-friendly prompts when trait is anxious", () => {
    const prompts = deriveQuickPrompts({
      financialProfile: makeProfile({
        behavior_traits: ["anxious"],
      }),
      memory: makeMemory(),
      monthlyIncome: 3000,
      monthlyExpenses: 2500,
      hasEmergencyFund: true,
    });
    expect(prompts.join(" ").toLowerCase()).toMatch(/stress|sereinité|sérénit|pression|sans pression/);
  });

  it("returns 4 prompts in every branch", () => {
    const empty = deriveQuickPrompts({
      financialProfile: null,
      memory: null,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      hasEmergencyFund: false,
    });
    expect(empty).toHaveLength(4);
  });
});
