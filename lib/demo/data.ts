import type { Expense, Goal, Income, FinancialProfile } from "@/types/database";

const NOW = new Date().toISOString();
const DEMO_USER_ID = "demo-user";

export type DemoTranslator = (key: string) => string;

export const demoFinancialProfile: FinancialProfile = {
  id: "demo-fp",
  user_id: DEMO_USER_ID,
  situation: "tight",
  monthly_income: 2450,
  monthly_expenses: 2180,
  current_savings: 1200,
  monthly_debt: 220,
  has_emergency_fund: false,
  main_goal: "emergency_fund",
  perceived_stress: 4,
  stability_score: 42,
  stress_score: 64,
  behavior_traits: ["anxious", "avoidant", "motivated"],
  created_at: NOW,
  updated_at: NOW,
};

export function getDemoIncomes(t: DemoTranslator): Income[] {
  return [
    {
      id: "demo-inc-1",
      user_id: DEMO_USER_ID,
      label: t("incomes.salary"),
      amount: 2300,
      category: "salary",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-inc-2",
      user_id: DEMO_USER_ID,
      label: t("incomes.freelance"),
      amount: 150,
      category: "freelance",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
  ];
}

export function getDemoExpenses(t: DemoTranslator): Expense[] {
  return [
    {
      id: "demo-exp-1",
      user_id: DEMO_USER_ID,
      label: t("expenses.housing"),
      amount: 880,
      category: "housing",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-exp-2",
      user_id: DEMO_USER_ID,
      label: t("expenses.food"),
      amount: 420,
      category: "food",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-exp-3",
      user_id: DEMO_USER_ID,
      label: t("expenses.transport"),
      amount: 180,
      category: "transport",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-exp-4",
      user_id: DEMO_USER_ID,
      label: t("expenses.utilities"),
      amount: 120,
      category: "utilities",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-exp-5",
      user_id: DEMO_USER_ID,
      label: t("expenses.insurance"),
      amount: 45,
      category: "insurance",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-exp-6",
      user_id: DEMO_USER_ID,
      label: t("expenses.debt"),
      amount: 220,
      category: "debt",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-exp-7",
      user_id: DEMO_USER_ID,
      label: t("expenses.subscriptions"),
      amount: 38,
      category: "subscriptions",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-exp-8",
      user_id: DEMO_USER_ID,
      label: t("expenses.leisure"),
      amount: 145,
      category: "leisure",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-exp-9",
      user_id: DEMO_USER_ID,
      label: t("expenses.shopping"),
      amount: 132,
      category: "shopping",
      frequency: "monthly",
      notes: null,
      created_at: NOW,
      updated_at: NOW,
    },
  ];
}

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export function getDemoGoals(t: DemoTranslator): Goal[] {
  return [
    {
      id: "demo-goal-1",
      user_id: DEMO_USER_ID,
      title: t("goals.emergencyFund"),
      type: "emergency_fund",
      target_amount: 2200,
      current_amount: 1200,
      deadline: inDays(180),
      notes: null,
      is_completed: false,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-goal-2",
      user_id: DEMO_USER_ID,
      title: t("goals.debtPayoff"),
      type: "debt_payoff",
      target_amount: 1800,
      current_amount: 480,
      deadline: inDays(365),
      notes: null,
      is_completed: false,
      created_at: NOW,
      updated_at: NOW,
    },
  ];
}

export function getDemoProfile(t: DemoTranslator) {
  return {
    full_name: t("profileName"),
    email: "demo@liberia.app",
    avatar_url: null,
    currency: "CHF",
    locale: "fr-CH",
    country: "CH",
  };
}
