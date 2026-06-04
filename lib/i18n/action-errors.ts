import { getTranslations } from "next-intl/server";

/**
 * Translator scoped to `errors.actions.*` for server action error
 * messages. Built on demand inside each server action so the locale
 * resolution lives in one place. Returns a function taking a key
 * (without prefix) and yielding the user-locale message.
 *
 * Centralising here means every action returns a localised
 * `{ ok: false, error }` without each one importing
 * `getTranslations` separately, and prevents drift between actions
 * that handle the same error case.
 */
export type ActionErrorKey =
  | "authRequired"
  | "authRequiredDemo"
  | "invalidData"
  | "conversationInvalid"
  | "titleInvalid"
  | "prefUnknown"
  | "profileUnavailable"
  | "accountDeletionUnavailable"
  | "invalidLink"
  | "invalidOrExpiredLink"
  | "invalidHorizon"
  | "tooManyPlans"
  | "planForReal"
  | "planGenerationError"
  | "planSoon"
  | "planInvalid"
  | "regionUnsupported"
  | "subUnavailable"
  | "coachUnavailable"
  | "exportNote"
  | "serviceUnavailable"
  | "invalidRequest"
  | "planNotYet"
  | "tooManyAttempts"
  | "stripeError"
  | "invalidSignature"
  | "conversationNotFound"
  | "tooManyMessages"
  | "noActiveSubscription"
  | "subscriptionsActivating"
  | "outOfScope"
  | "coachStreamError"
  | "premiumRequired"
  | "premiumLapsed"
  | "newConversationDefaultTitle";

export async function getActionErrors(): Promise<
  (key: ActionErrorKey) => string
> {
  const t = await getTranslations("errors.actions");
  return (key) => t(key);
}
