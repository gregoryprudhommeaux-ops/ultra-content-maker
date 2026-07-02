# Déploiement Vercel — ULTRA CONTENT MAKER

## Variables d'environnement (à copier dans Vercel → Settings → Environment Variables)

**Production + Preview :**

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ultra-content-maker.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ultra-content-maker
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=ultra-content-maker
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

`FIREBASE_PRIVATE_KEY` : collez la clé du JSON service account (Vercel accepte les `\n` littéraux).

**Notifications de connexion (optionnel) :**

```
RESEND_API_KEY=
RESEND_FROM_EMAIL=Ultra Content Maker <notifications@votredomaine.com>
ADMIN_LOGIN_NOTIFY_EMAIL=gregory.prudhommeaux@gmail.com
```

**Digest hebdomadaire admin (lundi 08:00 Paris / 07:00 UTC) :**

```
CRON_SECRET=une-chaine-aleatoire-longue
ADMIN_WEEKLY_DIGEST_EMAIL=gregory.prudhommeaux@gmail.com
```

Ajoutez `CRON_SECRET` aussi sur Vercel. Le cron est déclaré dans `vercel.json` (`/api/cron/admin-weekly-digest`).

Test manuel (connecté en admin) : `POST /api/admin/weekly-digest` · aperçu sans envoi : `POST /api/admin/weekly-digest?dryRun=1`

Créez une clé API sur [Resend](https://resend.com), vérifiez un domaine d’envoi (ou utilisez `onboarding@resend.dev` en test — envoi limité au propriétaire du compte Resend). Sans `RESEND_API_KEY`, les connexions fonctionnent mais aucun e-mail n’est envoyé.

## Firebase après le 1er déploiement

Authentication → Settings → **Authorized domains** → ajoutez :

- `votre-projet.vercel.app`
- votre domaine custom si applicable

## Import Vercel

1. https://vercel.com/new → Import Git repository
2. Framework : Next.js
3. Build command : `npm run build` (Webpack via `package.json`)
4. Deploy

## URL d'entrée

`https://<votre-app>.vercel.app/fr/login`
