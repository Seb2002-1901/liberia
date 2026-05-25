import { z } from "zod";
import {
  COACHING_TONES,
  RECURRING_CHALLENGES,
  SPENDING_TRIGGERS,
} from "@/lib/constants";

const coachingToneIds = COACHING_TONES.map((c) => c.id) as [string, ...string[]];
const recurringChallengeIds = RECURRING_CHALLENGES.map((c) => c.id) as [
  string,
  ...string[],
];
const spendingTriggerIds = SPENDING_TRIGGERS.map((c) => c.id) as [
  string,
  ...string[],
];

export const coachingToneSchema = z.enum(coachingToneIds);

/**
 * Schema for the /settings → Coaching memory section.
 *
 * Every field is optional so the UI can save partial updates (e.g. only
 * the coaching tone) without forcing the user to re-fill the rest.
 * Server-side caps mirror the DB CHECK constraints exactly so an
 * SDK-bypass attempt fails twice (zod first, then Postgres).
 */
export const memoryUpdateSchema = z.object({
  coachingTone: coachingToneSchema.nullable().optional(),
  recurringChallenges: z
    .array(z.enum(recurringChallengeIds))
    .max(8)
    .optional(),
  spendingTriggers: z.array(z.enum(spendingTriggerIds)).max(8).optional(),
  progressNotes: z
    .string()
    .max(1000, "Notes trop longues (max 1000 caractères).")
    .nullable()
    .optional(),
});

export type MemoryUpdateInput = z.infer<typeof memoryUpdateSchema>;
