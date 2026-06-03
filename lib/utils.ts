import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLocaleForLanguage } from "./locale/languages";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency = "CHF",
  locale = "fr-CH",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyPrecise(
  amount: number,
  currency = "CHF",
  locale = "fr-CH",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Renders an amount using the user's profile preferences. Single entry
 * point for every personal amount in the app. Country qualifies a
 * bare language tag so "fr" with country "CH" formats as "1'234 CHF"
 * while "fr" with country "FR" formats as "1 234,00 CHF". Region-
 * qualified tags ("fr-CH", "en-GB") are passed through unchanged.
 */
export function formatUserCurrency(
  amount: number,
  profile:
    | {
        currency?: string | null;
        locale?: string | null;
        country?: string | null;
      }
    | null
    | undefined,
): string {
  const intlLocale = getLocaleForLanguage(
    profile?.locale ?? "fr-CH",
    profile?.country,
  );
  return formatCurrency(amount, profile?.currency ?? "CHF", intlLocale);
}

export function formatPercent(value: number, locale = "fr-CH"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatDate(
  date: string | Date,
  locale = "fr-CH",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
