#!/usr/bin/env bash
# Script tout-en-un — protocole Vercel preview LIBERIA
# Usage : ./tests/e2e/run-vercel-protocol.sh
#
# Variables requises (export avant ou .env.e2e-vercel) :
#   PLAYWRIGHT_BASE_URL   — URL preview Vercel
#   E2E_USER_EMAIL        — compte test Supabase
#   E2E_USER_PASSWORD     — password
#   E2E_STRIPE_CARD       — "4242424242424242"
#
# Le script :
#   1. Vérifie les prérequis (Vercel CLI, Stripe CLI, Playwright)
#   2. Vérifie les env vars
#   3. Lance les 6 tests Playwright vercel-real.spec.ts en série
#   4. Triggue 6 events Stripe webhook
#   5. Produit un rapport final

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

RESULTS_DIR="tests/e2e/results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"
REPORT="$RESULTS_DIR/report.md"

echo "# Vercel preview — résultats $(date)" > "$REPORT"
echo "" >> "$REPORT"

log() {
  echo -e "$1"
  echo "$1" | sed 's/\x1b\[[0-9;]*m//g' >> "$REPORT"
}

ok() { log "${GREEN}✓ $1${NC}"; }
warn() { log "${YELLOW}⚠ $1${NC}"; }
fail() { log "${RED}✗ $1${NC}"; }

# ── Phase 0 : prérequis ──
log "## Phase 0 — Prérequis"

check_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    ok "$1 installé : $(command -v "$1")"
  else
    fail "$1 manquant — installer d'abord (voir VERCEL-PROTOCOL-EXEC.md §0.1)"
    exit 1
  fi
}

check_cmd npx
check_cmd stripe || true  # stripe CLI optionnel pour Phase 5
[ -x "${PW_CHROME_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}" ] && ok "Chromium 1194 OK" || warn "Chromium pré-installé absent"

# ── Phase 0.2 : env vars ──
log ""
log "## Phase 0.2 — Variables d'environnement"

required_vars=(
  PLAYWRIGHT_BASE_URL
  E2E_USER_EMAIL
  E2E_USER_PASSWORD
  E2E_STRIPE_CARD
)
missing=0
for v in "${required_vars[@]}"; do
  if [ -z "${!v:-}" ]; then
    fail "$v non défini"
    missing=$((missing + 1))
  else
    ok "$v = ${!v:0:30}..."
  fi
done

if [ $missing -gt 0 ]; then
  log ""
  fail "$missing variable(s) manquante(s). Configurer puis relancer."
  exit 1
fi

# ── Phase 1 : smoke check Vercel ──
log ""
log "## Phase 1 — Smoke check Vercel preview"

if curl -fsSL -I "$PLAYWRIGHT_BASE_URL" -o /dev/null; then
  ok "Vercel preview répond : $PLAYWRIGHT_BASE_URL"
else
  fail "Vercel preview ne répond pas. Vérifier déploiement."
  exit 1
fi

# ── Phase 4 : Playwright ──
log ""
log "## Phase 4 — Tests Playwright vercel-real (6 tests)"

export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
export PW_CHROME_PATH="${PW_CHROME_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"

tests=(
  "Coach IA > envoyer"
  "Coach IA > Shift"
  "Stripe > checkout"
  "Stripe > portal"
  "Propagation > revenu"
  "Profil > prénom"
)

pw_results=()
for t in "${tests[@]}"; do
  log ""
  log "→ Test : $t"
  if npx playwright test tests/e2e/vercel-real.spec.ts \
       --project=chromium \
       --grep "$t" \
       --reporter=list \
       --output "$RESULTS_DIR/pw-output" \
       > "$RESULTS_DIR/$(echo "$t" | tr ' >' '__').log" 2>&1; then
    ok "$t : PASS"
    pw_results+=("$t|PASS")
  else
    fail "$t : FAIL — voir $RESULTS_DIR/$(echo "$t" | tr ' >' '__').log"
    pw_results+=("$t|FAIL")
  fi
done

# ── Phase 5 : Stripe webhooks ──
log ""
log "## Phase 5 — Stripe webhook triggers (6 events)"

if command -v stripe >/dev/null 2>&1; then
  events=(
    customer.subscription.created
    customer.subscription.updated
    customer.subscription.deleted
    invoice.paid
    invoice.payment_failed
  )
  stripe_results=()
  for ev in "${events[@]}"; do
    log ""
    log "→ Trigger : $ev"
    if stripe trigger "$ev" > "$RESULTS_DIR/stripe-$ev.log" 2>&1; then
      ok "$ev : déclenché"
      stripe_results+=("$ev|TRIGGERED")
    else
      fail "$ev : ÉCHEC trigger"
      stripe_results+=("$ev|FAILED")
    fi
    sleep 1
  done
  warn "Vérifier manuellement dans Supabase que la table subscriptions reflète chaque event"
else
  warn "Stripe CLI absent — skip Phase 5. Installer pour valider webhooks."
fi

# ── Rapport final ──
log ""
log "## 🎯 Rapport final"
log ""
log "### Phase 4 — Playwright auto"
for r in "${pw_results[@]}"; do
  IFS='|' read -r name status <<< "$r"
  log "- [$([ "$status" == "PASS" ] && echo "x" || echo " ")] $name : $status"
done

if command -v stripe >/dev/null 2>&1; then
  log ""
  log "### Phase 5 — Stripe events"
  for r in "${stripe_results[@]}"; do
    IFS='|' read -r name status <<< "$r"
    log "- [$([ "$status" == "TRIGGERED" ] && echo "x" || echo " ")] $name : $status"
  done
fi

log ""
log "### Phase 6 — iPhone réel (manuel)"
log "À tester manuellement — voir VERCEL-PROTOCOL-EXEC.md §6"

log ""
log "### Phase 7 — RLS sécurité (manuel)"
log "À tester manuellement — voir VERCEL-PROTOCOL-EXEC.md §7"

log ""
log "## Verdict"
fail_count=$(printf '%s\n' "${pw_results[@]}" | grep -c "FAIL" || true)
if [ "$fail_count" -eq 0 ]; then
  ok "🚀 Phase 4 PASS — passer à Phase 6/7 manuels"
else
  fail "⛔ $fail_count test(s) en échec — corriger avant suite"
fi

log ""
log "Rapport complet : $REPORT"
