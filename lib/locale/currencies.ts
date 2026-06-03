/**
 * Currency catalog (V1). Owned by the profile form — every personal
 * amount in the app is rendered with the user's currency, while the
 * LIBERIA subscription itself stays billed in CHF for launch (see
 * the note on /settings/subscription).
 */
export type CurrencyId =
  | "CHF"
  | "EUR"
  | "USD"
  | "GBP"
  | "CAD"
  | "TRY";

export type Currency = {
  id: CurrencyId;
  label: string;
};

export const CURRENCIES: readonly Currency[] = [
  { id: "CHF", label: "CHF — Franc suisse" },
  { id: "EUR", label: "EUR — Euro" },
  { id: "USD", label: "USD — Dollar américain" },
  { id: "GBP", label: "GBP — Livre sterling" },
  { id: "CAD", label: "CAD — Dollar canadien" },
  { id: "TRY", label: "TRY — Livre turque" },
] as const;

export function isCurrencyId(value: unknown): value is CurrencyId {
  return CURRENCIES.some((c) => c.id === value);
}
