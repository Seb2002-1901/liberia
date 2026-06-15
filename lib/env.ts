/**
 * Boolean accessors for optional integrations.
 *
 * Phase 2 services (Stripe live, Anthropic, Upstash, Sentry) are wired
 * conditionally — the app must remain runnable without them. Each
 * `isXConfigured()` is the single source of truth used by callers to
 * decide whether to actually call the service or short-circuit.
 */

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function isSentryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN);
}

/**
 * Sprint S2-BIS — social login provider detection.
 *
 * Les flags sont publics (`NEXT_PUBLIC_*`) car le bouton OAuth doit
 * être conditionné côté client AVANT que l'utilisateur cliquey — un
 * bouton qui mène à une 500 Supabase ("provider is not enabled") est
 * pire que pas de bouton. L'activation réelle se fait côté Supabase
 * Dashboard (Auth → Providers) ; ces flags signalent juste qu'on l'a
 * fait pour que l'UI s'affiche.
 *
 * Apple est requis par la review App Store quand un autre social
 * login est offert (Apple Guideline 4.8). Si Google est activé mais
 * pas Apple, on refusera le build pour publication iOS — c'est
 * documenté dans STRIPE_SETUP.md et le rapport S2.
 */
export function isGoogleAuthConfigured(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
}

export function isAppleAuthConfigured(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true";
}

export function isAnySocialAuthConfigured(): boolean {
  return isGoogleAuthConfigured() || isAppleAuthConfigured();
}

/**
 * Sprint Coach IA — détection clé de transcription audio.
 *
 * Pour activer la dictée vocale dans le composer coach, on a besoin
 * d'un service de speech-to-text. Choix Whisper (OpenAI) car :
 *  - HTTPS direct, format multipart standard
 *  - 0.006 USD/minute (négligeable au volume LIBERIA)
 *  - Robuste FR/EN/ES/IT/PT/DE (les 6 locales LIBERIA)
 *
 * Côté client : `NEXT_PUBLIC_TRANSCRIPTION_ENABLED=true` doit être
 * activé pour afficher le bouton micro. Le bouton resterait visible
 * sinon (UX dégradée → mort) → on préfère ne RIEN afficher si pas
 * configuré (cf. instruction P0-5 "aucun bouton mort").
 *
 * Côté serveur : `OPENAI_API_KEY` est la vraie source de vérité —
 * sans elle l'endpoint /api/ai/transcribe retourne 501.
 */
export function isTranscriptionUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TRANSCRIPTION_ENABLED === "true";
}

export function isTranscriptionServerConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
