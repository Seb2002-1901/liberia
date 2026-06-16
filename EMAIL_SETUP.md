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

---

# Sprint S3 — Domaine email & inbox placement

Sans **DKIM + SPF + DMARC** corrects sur le domaine d'envoi, les emails
LIBERIA (reset password, weekly recap, alertes) atterrissent en spam ou
sont droppés. Conséquence directe : les liens reset password ne sont
jamais cliqués → tickets support dès J+1, réputation domaine flinguée.

## 9. Records DNS obligatoires (Resend)

Resend Dashboard → **Domains** → ➕ Add Domain → `liberia.app` →
Resend affiche les valeurs **exactes** à pousser chez le registrar
(Cloudflare, Gandi, OVH). L'exemple ci-dessous est indicatif :

| Type | Name | Value |
|---|---|---|
| `MX` | `send.liberia.app` | `feedback-smtp.eu-west-1.amazonses.com` priority 10 |
| `TXT` | `send.liberia.app` | `v=spf1 include:amazonses.com ~all` |
| `TXT` | `resend._domainkey.liberia.app` | `p=<clé publique fournie par Resend>` |
| `TXT` | `_dmarc.liberia.app` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@liberia.app` |

⚠️ **Cloudflare** : passer le proxy en "DNS only" (cloud gris) pour
les records TXT et MX, sinon Cloudflare les masque.

Vérification CLI :
```bash
dig TXT resend._domainkey.liberia.app +short
dig TXT send.liberia.app +short
dig TXT _dmarc.liberia.app +short
```

Resend Dashboard → bouton **Verify DNS Records** (attendre 5-15 min
après la création).

## 10. DMARC — Politique évolutive

DMARC dit aux serveurs receveurs quoi faire d'un email qui échoue
SPF/DKIM. Progression recommandée :

| Phase | Politique | Durée |
|---|---|---|
| Bootstrap | `p=none` | 1-2 semaines (observer les rapports) |
| Stabilisation | `p=quarantine` | 1-2 semaines (spam folder tolérable) |
| Production | `p=reject` | Permanent (drop strict) |

Record DMARC production recommandé :
```
v=DMARC1; p=reject; sp=reject; pct=100; rua=mailto:dmarc@liberia.app; adkim=s; aspf=s; fo=1
```

⚠️ Ne PAS passer en `p=reject` direct — risque de blackholer un legit
cron / double-send Stripe.

## 11. Vérification runtime (sans DNS lookup)

`lib/email/resend.ts` expose `getResendReadinessWarnings()` — appelable
depuis une route admin ou un health-check. Reporte les manques de
config (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) sans throw.

⚠️ Ce check ne fait **pas** de lookup DNS au runtime — c'est trop
coûteux à chaque cold start. La validation DKIM/SPF/DMARC reste une
checklist humaine au moment du déploiement.

## 12. Test inbox placement

1. **Reset password e2e** : `/forgot-password` → entrer email →
   vérifier que le mail arrive en INBOX (pas spam) Gmail/Outlook/iCloud.
2. **mail-tester.com** : envoyer un email LIBERIA à l'adresse fournie
   par le site → score attendu **≥ 9/10**.
3. **Show original** (Gmail / iCloud) → vérifier :
   ```
   DKIM-Signature: ... d=liberia.app
   SPF: PASS
   DMARC: PASS
   ```

## 13. Checklist S3 d'activation domaine

- [ ] Domaine custom acheté et MX configurés
- [ ] Compte Resend créé, région EU (Frankfurt)
- [ ] 4 records DNS poussés (SPF/DKIM/DMARC/MX)
- [ ] Resend "Domain verified" ✅
- [ ] `RESEND_API_KEY` + `RESEND_FROM_EMAIL` dans Vercel prod + preview
- [ ] Reset password e2e : email arrive en inbox (pas spam) sur 3 webmail
- [ ] mail-tester.com ≥ 9/10
- [ ] DMARC `p=none` → `p=quarantine` → `p=reject` (3 semaines)
- [ ] Inbox `coach@liberia.app` reçoit les bounces
- [ ] Rapports DMARC `dmarc@liberia.app` revus 1×/semaine

## 14. Pièges connus

| Symptôme | Cause | Fix |
|---|---|---|
| Email part en spam | DKIM échec | Cloudflare proxy doit être OFF |
| Email pas reçu | SPF échec | Vérifier `send.liberia.app` TXT |
| Resend "DNS not verified" | DNS pas propagé | Attendre 30 min, reverify |
| `550-5.7.26` bounce | DMARC `p=reject` strict trop tôt | Régulariser SPF/DKIM avant |
| `RESEND_FROM_EMAIL` rejeté | From sur domaine non vérifié | Aligner sur le domaine Resend |
