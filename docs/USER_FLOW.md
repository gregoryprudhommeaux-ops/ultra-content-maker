# USER_FLOW — ULTRA CONTENT MAKER (v3)

Routes are locale-prefixed: `/en/...`, `/fr/...`, `/es/...`.

**No multi-client list.** One linear workspace per user.

---

## Primary journey

| # | Step | Goal |
|---|------|------|
| 1 | Sign up / log in | Firebase Auth |
| 2 | Mon profil (Author) | Links: LinkedIn, site, blog, example **post URLs** |
| 3 | Audience (Cible) | Short optional sketch — or **Skip** |
| 4 | Persona | Generate **expert prompt** → edit → validate |
| 5 | Articles | **Brief post** (objectif + preuve) → generate **4** sample posts (or 2 from `/news`) |
| 6 | Refine | Quality panel + per-post questions → revise |
| 7 | Validate + CTA | Pick CTA → build `exportText` |
| 8 | Copy | Clipboard → paste on LinkedIn |

```mermaid
flowchart LR
  A[Auth] --> B[/setup/author]
  B --> C[/setup/audience]
  C --> D[/persona]
  D --> E[/articles]
  E --> F[/articles/id]
  F --> G[Copy]
```

---

## Routes & screens

| Route | Screen | Key behavior |
|-------|--------|----------------|
| `/[locale]/login`, `/signup` | Auth | Redirect if session exists |
| `/[locale]` | Home redirect | → next incomplete `setupStep` |
| `/[locale]/setup/author` | Author profile | URL inputs, add source links, all optional, **Mark complete** |
| `/[locale]/setup/audience` | Audience sketch | Short fields + **Skip** |
| `/[locale]/persona` | Persona | Generate expert prompt → textarea edit → **Validate Persona** |
| `/[locale]/articles` | Article list | Post brief form, news picker, batches of 4; status badges |
| `/[locale]/news` | Archived news | Pick archived story → brief → generate 2 posts |
| `/[locale]/articles/[id]` | Article detail | Quality panel, hooks alternatifs, refinement, CTA by objective, validate |
| `/[locale]/ctas` | CTA library | Create / edit reusable CTAs |
| `/[locale]/settings` | Settings | Locale, sign out, content language default |

### Deprecated routes (v1 — remove in implementation)

| Old route | v2 |
|-----------|-----|
| `/clients` | `/setup/author` or `/persona` |
| `/clients/[id]` | `/persona` or `/articles` |
| `/clients/[id]/onboarding` | `/setup/author` + `/setup/audience` |
| `/clients/[id]/brain` | `/persona` |
| `/clients/[id]/generate` | `/articles` |

---

## Author screen (`/setup/author`)

| Section | Inputs |
|---------|--------|
| Core links | LinkedIn profile, website, blog (optional URLs) |
| Example posts | Add rows: type `linkedin_post` \| `blog` + URL (no paste) |
| Optional text | Role title, one-line positioning (short only) |
| Language | `contentLanguage` for generated posts |

**Actions:** Save (autosave), Add source link, Remove link, **Continue** → sets `author.status = complete`, `setupStep = audience`.

**Empty state:** First visit shows helper copy: “Start with your LinkedIn profile URL.”

---

## Audience screen (`/setup/audience`)

| Field | Required |
|-------|----------|
| Target label (general type) | No |
| Content focus (themes to highlight) | No |
| Notes | No |

**Actions:** Save, **Skip** (`audience.skipped = true`), **Continue** → `setupStep = persona`.

---

## Persona screen (`/persona`)

| State | UI |
|-------|-----|
| `persona.status === none` | CTA **Generate Persona** (disabled if no author data at all) |
| `draft` | Large textarea `promptText` + **Regenerate** + **Validate Persona** |
| `validated` | Read-only or editable warning + link **Generate articles** |

**Gate:** Articles route requires `persona.status === validated`.

---

## Articles list (`/articles`)

- Group by `batchId` (one row “Batch — date”)  
- Each card: hook preview, status `draft` \| `refining` \| `validated`  
- **Generate 3–4 new posts** (new batch) — allowed anytime after Persona validated  

---

## Article detail (`/articles/[id]`)

1. Show `hook`, `body`, `ps`  
2. **Refinement block:** 3–4 questions (tone, theme, length, hook) + global comment  
3. **Apply feedback** → revision/regenerate → updates body  
4. **Validate:** modal/drawer CTA picker (library + create inline)  
5. **Copy for LinkedIn** → `exportText`  

---

## Gates & rules

| Action | Prerequisite |
|--------|----------------|
| Generate Persona | `author.complete` OR ≥1 `sources` doc |
| Validate Persona | `promptText` length ≥ min (e.g. 500 chars) |
| Generate articles | `persona.status === validated` |
| Validate article | Refinement submitted (at least one answer or comment) |
| Copy export | `status === validated` |

---

## Empty / error states

| Screen | Empty | Error |
|--------|-------|-------|
| Author | Onboarding tips | Firestore permission → deploy rules |
| Persona | “Complete author first” | LLM timeout → retry |
| Articles | “Validate Persona first” | Batch failed → partial retry |
| Article detail | — | Regeneration failed |
| CTAs | “Create your first CTA” | — |

---

## Language switcher

Header: **EN | FR | ES** — updates URL + `users/{uid}.preferredLocale`.  
Generated post language = `author.contentLanguage` (not UI locale).

---

## Related docs

`PRD.md`, `DATA_MODEL.md`, `PROMPT_ARCHITECTURE.md`
