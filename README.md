# ULTRA CONTENT MAKER

Internal tool to onboard clients, build a validated **Content Brain**, and generate LinkedIn ideas, calendars, and drafts.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Firebase Auth + Firestore (**no Cloud Storage** in MVP — paste/URLs only)
- next-intl (UI: **en**, **fr**, **es**)
- OpenAI (Phases 4–5)

## Quick start

```bash
cd ~/Documents/ultra-content-maker
cp .env.example .env.local
# Fill Firebase + OpenAI keys in .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/en/clients`.

## Firebase setup

1. Use your existing Firebase project.
2. Enable **Authentication** → Email/Password + Google.
3. Create **Firestore** (Storage **not required** — skipped to reduce cost).
4. Deploy Firestore rules only:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use --add ultra-content-maker
npx -y firebase-tools@latest deploy --only firestore:rules
```

5. Add `localhost` to Auth authorized domains.

## i18n

- Edit UI strings in `messages/en.json` only.
- Run `npm run i18n:sync` to refresh `fr.json` and `es.json` (requires `OPENAI_API_KEY`).

## Docs

See [`docs/`](docs/) for PRD, user flow, data model, prompts, and i18n guide.

## Roadmap

- [x] Phase 0 — Documentation
- [x] Phase 1 — Scaffold, auth shell, clients list/create
- [ ] Phase 3 — Onboarding wizard (5 steps)
- [ ] Phase 4 — Content Brain
- [ ] Phase 5 — Content generation
