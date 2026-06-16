/**
 * Sprint S2-BIS — client-side throttle pour les formulaires d'auth.
 *
 * Ce N'EST PAS un anti-brute-force (un attaquant ignore notre JS).
 * Le vrai rate-limit vit côté Supabase (rate-limit GoTrue + Upstash
 * sur nos endpoints custom). Ce throttle protège contre :
 *
 *  - Le double-clic accidentel sur "Se connecter" qui déclenche 2
 *    signInWithPassword en parallèle et fait clignoter les toasts.
 *  - Le user qui spam le bouton après une erreur ("ça marche pas !"
 *    × 6) → on lui montre un compteur honnête au lieu d'enfiler les
 *    requêtes.
 *
 * Stocké en localStorage par identifiant (email pour login/forgot,
 * "register" pour register). Window = 60s, max 5 tentatives → après
 * la 5e, le formulaire refuse pendant le reste de la fenêtre et
 * affiche "Trop d'essais, réessaie dans Ns".
 *
 * En SSR (ou Safari ITP qui bloque parfois localStorage), on dégrade
 * gracieusement : pas de throttle, le serveur reste la dernière ligne.
 */

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const STORAGE_PREFIX = "lib:auth-throttle:";

type Entry = { attempts: number; firstAt: number };

function readEntry(key: string): Entry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (typeof parsed.attempts !== "number" || typeof parsed.firstAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeEntry(key: string, entry: Entry): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* localStorage indisponible (Safari ITP, mode privé) — on s'en passe */
  }
}

export type ThrottleCheck =
  | { allowed: true }
  | { allowed: false; retryInSeconds: number };

/**
 * Inspecte (sans incrémenter) si une nouvelle tentative est autorisée.
 * Appelé AVANT de soumettre — si bloqué, on n'enchaîne pas la requête
 * réseau et on affiche le compteur.
 */
export function checkAuthThrottle(key: string): ThrottleCheck {
  const entry = readEntry(key);
  const now = Date.now();
  if (!entry || now - entry.firstAt >= WINDOW_MS) {
    return { allowed: true };
  }
  if (entry.attempts < MAX_ATTEMPTS) {
    return { allowed: true };
  }
  const retryInSeconds = Math.ceil((WINDOW_MS - (now - entry.firstAt)) / 1000);
  return { allowed: false, retryInSeconds: Math.max(retryInSeconds, 1) };
}

/**
 * À appeler APRÈS un échec (mauvais mot de passe, lien expiré). Une
 * réussite remet le compteur à zéro via `clearAuthThrottle`.
 */
export function bumpAuthThrottle(key: string): void {
  const entry = readEntry(key);
  const now = Date.now();
  if (!entry || now - entry.firstAt >= WINDOW_MS) {
    writeEntry(key, { attempts: 1, firstAt: now });
    return;
  }
  writeEntry(key, { attempts: entry.attempts + 1, firstAt: entry.firstAt });
}

export function clearAuthThrottle(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* idem readEntry */
  }
}
