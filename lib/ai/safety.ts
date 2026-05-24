import { z } from "zod";

const MAX_USER_MESSAGE_CHARS = 4000;
const MAX_CONVERSATION_TURNS = 40;

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid("Conversation invalide"),
  content: z
    .string()
    .trim()
    .min(1, "Message vide")
    .max(MAX_USER_MESSAGE_CHARS, `Message trop long (max ${MAX_USER_MESSAGE_CHARS} caractères)`),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const conversationTitleSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const conversationIdSchema = z.object({
  id: z.string().uuid(),
});

export { MAX_USER_MESSAGE_CHARS, MAX_CONVERSATION_TURNS };

/**
 * Lightweight prompt-injection / abuse filter applied before forwarding
 * to Claude. The system prompt already locks the role server-side, so
 * this is defense-in-depth, not the primary control.
 */
export function looksLikeAbuse(text: string): boolean {
  const lowered = text.toLowerCase();
  // Reject extremely long single tokens (likely a payload, not a question).
  if (text.split(/\s+/).some((w) => w.length > 400)) return true;
  // Reject if the message is exclusively meta-instructions to ignore rules.
  const overrides = [
    "ignore previous instructions",
    "ignore all previous",
    "tu es maintenant",
    "you are now",
    "system prompt",
    "reveal your system",
    "show your system prompt",
  ];
  return overrides.some((m) => lowered.includes(m)) && text.length < 200;
}
