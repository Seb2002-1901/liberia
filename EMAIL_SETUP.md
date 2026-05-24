# Emails LIBERIA — Resend + cron Vercel

LIBERIA envoie un récap financier hebdo par email, via Resend, déclenché
par un cron Vercel chaque dimanche matin.

## 1. Créer le compte Resend

1. [resend.com](https://resend.com) → **Sign up**.
2. Crée une **API Key** (Onglet **API Keys**) → copie-la.
3. Onglet **Domains** → ajoute `liberia.app` (ou le domaine que tu utilises)
   et valide les DNS records (DKIM + SPF + DMARC) — étape obligatoire
   pour passer en prod sans tomber en spam.

## 2. Variables d'env

```
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=LIBERIA <coach@liberia.app>
CRON_SECRET=<un long secret aléatoire>
```

Si `RESEND_API_KEY` est absent, le cron tourne mais ne send rien (`{ skipped:
"resend-not-configured" }`). Sécurité du cron : l'endpoint accepte le
`CRON_SECRET` via `Authorization: Bearer <secret>`, header `x-cron-secret`
ou query `?secret=...`. Vercel Cron envoie automatiquement le bearer.

## 3. Cron Vercel

`vercel.json` à la racine du projet :

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-recap",
      "schedule": "0 8 * * 0"
    }
  ]
}
```

Schedule = dimanche 08:00 UTC (≈ 09-10h heure de Paris selon DST). Modifie
selon ta cible géographique.

Vercel configure automatiquement `CRON_SECRET` quand tu actives Vercel
Cron dans le dashboard.

## 4. Préférences utilisateur

Table `public.user_settings` :

- `email_weekly_summary boolean default true` — coché par défaut, opt-out.
- `email_unsubscribe_token text unique` — token aléatoire généré au
  signup, mis dans le lien de désinscription.
- `last_weekly_sent_at timestamptz` — anti-double-send (skip si envoyé
  dans les 6 derniers jours).

L'utilisateur peut basculer via `/settings` (toggle "Résumé hebdomadaire").
Le lien `Se désinscrire` dans chaque email mène à `/unsubscribe?token=...`,
public, qui bascule `email_weekly_summary=false`.

## 5. Template

`lib/email/templates.ts` rend du HTML inline-styled (compat Gmail / Apple
Mail / Outlook web). Pas d'image, pas de JS, pas d'iframe. Variables
remplacées :

- prénom, revenus, dépenses, reste à vivre, taux d'épargne, score stabilité
- nombre d'étapes du plan validées la semaine + nombre restant
- URL unsubscribe + URL app

## 6. Tester localement

Sans Resend configuré, l'endpoint retourne `{ skipped: ... }` sans
envoyer. Pour tester avec un vrai email :

```bash
# Avec un compte test qui a opté in
curl -X GET "http://localhost:3000/api/cron/weekly-recap?secret=$CRON_SECRET"
```

Réponse :

```json
{ "sent": 1, "skipped": 0, "errors": [] }
```

## 7. Garde-fous

- L'email **ne contient pas** : numéros de carte, IBAN, mot de passe, token
  Anthropic, secret Stripe.
- Le système prompt + le contexte financier détaillé ne sont **jamais**
  inclus — uniquement les KPIs agrégés.
- Le disclaimer "n'est pas un conseil financier réglementé" est dans
  chaque email.
- Tu peux à tout moment retirer le cron du `vercel.json` pour stopper
  l'envoi sans toucher au code.

## 8. Coût

Resend offre **3 000 emails/mois en plan gratuit**. À 1 email/semaine/user,
ça couvre ~700 utilisateurs actifs gratuitement. Plan payant à $20/mois
pour 50 000 emails.
