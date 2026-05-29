# Roadmap UX par sprint — Ultra Content Maker

Document de pilotage pour Cursor : chaque sprint = tickets autonomes, fichiers cibles, critères d’acceptation, prompt prêt à coller.

**Arborescence produit (référence)**

```
/start → /setup/llm → /setup/author → /setup/audience → /persona → /start/ready → /articles/new
/articles (bibliothèque) · /articles/[id] (éditeur) · /news (actu secondaire)
```

**Légende statut :** ✅ Fait · 🟡 Partiel · ⬜ À faire

---

## Vue d’ensemble

| Sprint | Thème | Priorité | Statut global |
|--------|-------|----------|---------------|
| **S1** | Activation & onboarding-first | P0 | ✅ 100 % |
| **S2** | Compréhension produit (aide contextuelle) | P1 | ✅ 100 % |
| **S3** | Neutralisation legacy & polish entrée | P1 | ✅ 100 % |
| **S4** | Pilotage éditorial avancé | P2 | ✅ 100 % |

---

## Sprint 1 — Activation & onboarding-first (P0)

**Objectif :** Aucun utilisateur incomplet n’arrive « à vide » sur la création ; parcours setup lisible en moins de 5 secondes.

| Ticket | UX | Statut | Fichiers clés |
|--------|-----|--------|---------------|
| S1-T1 | OnboardingStatus central | ✅ | `onboarding-status.ts` |
| S1-T2 | Guards création + routes setup | ✅ | `onboarding-guard.tsx`, `onboarding-route-guard.tsx` |
| S1-T3 | Hub `/start` (prochaine action + complété) | ✅ | `welcome-screen.tsx` |
| S1-T4 | Profil essential obligatoire | ✅ | `author.ts`, `author-setup-form.tsx` |
| S1-T5 | Persona reveal (4 cartes + valider) | ✅ | `persona-reveal.tsx`, `extract-persona-summary.ts` |
| S1-T6 | Banner post-setup sur `/articles/new` | ✅ | `setup-ready-banner.tsx` |
| S1-T7 | Labels Obligatoire / Optionnel setup | ✅ | `optional-label.tsx`, onglets auteur, audience, `llm-setup-form.tsx` |
| S1-T8 | Message si setup incomplet sur création (modes dégradés) | ✅ | `brief-reminder-banner.tsx` |

### Critères de clôture S1

- [x] Redirect `nextHref` cohérent partout (guard, banner, `/start`)
- [x] `author complete` impossible sans LinkedIn + rôle + positionnement + langue
- [x] Persona = moment central avant validation
- [x] Utilisateur avec profil récent voit un rappel brief sur `/articles/new` (sans `?from=ready`)
- [x] Labels Obligatoire / Optionnel sur setup LLM, auteur (essential/voice), audience (skip explicite)

### Prompt Cursor — S1-T8 (reste)

```text
Sur /articles/new, si canAccessCreation mais hasGeneratedPost === false
et pas de query from=ready, afficher un bandeau discret rappelant
problème / POV / preuve avec lien vers l’aide brief (ContextHelp).
Fichier : article-creation-wizard.tsx. i18n setup.articles.create.briefReminder.*
```

---

## Sprint 2 — Compréhension produit (P1)

**Objectif :** Les termes métier (Persona, lot, portée, Quality Panel) sont compris sans doc externe.

| Ticket | UX | Statut | Fichiers clés |
|--------|-----|--------|---------------|
| S2-T1 | ContextHelp Persona (prompt, Topic DNA…) | ✅ | `persona-context-guide.tsx` |
| S2-T2 | ContextHelp portée (création brief) | ✅ | `post-brief-form.tsx` |
| S2-T3 | ContextHelp lot (bibliothèque) | ✅ | `articles-hub-header.tsx` |
| S2-T4 | ContextHelp filtre Généraliste / Niche | ✅ | `articles-library-toolbar.tsx` |
| S2-T5 | ContextHelp Quality Panel | ✅ | `article-quality-panel.tsx` |
| S2-T6 | ContextHelp Slop Panel | ✅ | `article-slop-panel.tsx` |
| S2-T7 | Explication mix 2+2 sur ligne lot | ✅ | `articles-hub.tsx`, `help.scopeMix` |
| S2-T8 | Tooltips CTA / Topic DNA en éditeur | ✅ | `article-editor.tsx`, `setup.articles.cta.help`, `detail.help.topicDna` |

### Critères de clôture S2

- [x] `ContextHelp` sur scope, lot, scope filter, quality
- [x] Slop panel : icône ? sur le titre (comme quality)
- [x] Brief : ContextHelp sur objectif, problème et preuve (`post-brief-form.tsx`)

### Prompt Cursor — S2-T6

```text
Ajouter ContextHelp sur le titre du panneau Slop (article-slop-panel.tsx),
clés i18n setup.articles.slop.help.label / body — reprendre l’intro existante
en version courte pour la bulle.
```

---

## Sprint 3 — Legacy & polish entrée (P1)

**Objectif :** Plus aucune incohérence `clients*` ; navigation 100 % alignée produit auteur.

| Ticket | UX | Statut | Fichiers clés |
|--------|-----|--------|---------------|
| S3-T1 | Redirect dur `/clients*` → setup ou 404 | ✅ | `proxy.ts`, `legacy-clients-redirect.ts`, `clients/**/page.tsx` |
| S3-T2 | Retirer liens nav / sitemap legacy clients | ✅ | `dashboard-nav.ts` (aucun lien clients) |
| S3-T3 | Audience : badge + skip explicite (fait) | ✅ | `audience-setup-form.tsx` |
| S3-T4 | Persona : CTA « Compléter profil » visible post-validation | ✅ | `persona-reveal.tsx` |
| S3-T5 | `/start/ready` checklist + lien persona review | ✅ | `ready-screen.tsx` |

### Critères de clôture S3

- [x] Aucune route `/clients/*` accessible sans redirect
- [x] Grep codebase : zero lien UI vers clients (internes legacy OK en code mort)

### Prompt Cursor — S3-T1

```text
Neutraliser legacy clients (UX-10) :
- middleware redirect /clients → /setup/llm
- /clients/[id]/* → /start ou 404
- vérifier qu’aucun composant nav ne référence clients
Ne pas supprimer le code legacy tant que les redirects couvrent la prod.
```

---

## Sprint 4 — Pilotage éditorial avancé (P2)

**Objectif :** Parcours post-première-génération lisible pour utilisateurs avancés sans surcharge UI.

| Ticket | UX | Statut | Fichiers clés |
|--------|-----|--------|---------------|
| S4-T1 | Actu = mode secondaire (`?mode=news`) | ✅ | `article-creation-wizard.tsx`, `news-page-redirect.tsx`, nav |
| S4-T2 | Éditeur : sections repliables (CTA, repurpose, traduction) | ✅ | `article-editor.tsx`, `editor-collapsible-section.tsx` |
| S4-T3 | Outils enrichis chargés à la demande | ✅ | `editor-collapsible-section.tsx`, `article-editor.tsx`, `editor-panel-placeholder.tsx` |
| S4-T4 | Bibliothèque : tri par date lot + session label | ✅ | `articles-hub.tsx`, `batch-session.ts` |
| S4-T5 | News fallback si setup incomplet | ✅ | `news-archive-list.tsx`, `OnboardingGuard` |

### Critères de clôture S4

- [x] Éditeur article : max 3 CTA visibles au premier écran (reste en accordéons)
- [x] `/news` absent de la nav principale onboarding (lien secondaire wizard only)
- [x] First paint éditeur < chargement actuel (lazy mount + dynamic import + CTA/illustration différés)

### Prompt Cursor — S4-T2

```text
Refactor article-editor.tsx (UX-12) :
- Grouper CTA, hashtags, traduction, illustration, repurpose en <details>
- Section par défaut ouverte : hook + body + affiner
- Quality + Slop restent accessibles, pas en premier fold si validated
Minimiser le diff, réutiliser les composants panel existants.
```

---

## Mapping Epics → Sprints

| Epic matrice | Sprint(s) |
|--------------|-----------|
| A — Activation & gating | S1 |
| B — Refonte profil | S1 (T4, T7) |
| C — Reveal Persona | S1 (T5) + S2 (T1) |
| D — Création guidée | S1 (T6, T8) + S4 (T1) |
| E — Pilotage éditorial | S2 (T2–T5) + S4 (T2–T4) |

---

## Ordre d’exécution recommandé (Cursor)

1. **S4-T2** — éditeur accordéons (plus gros chantier P2)

---

## Prompt master (planning)

```text
Contexte : Ultra Content Maker, Next.js App Router, i18n fr/en/es.
Lis docs/ux-matrice-pilotage.md et docs/ux-roadmap-sprints.md.

Mission : implémenter le ticket {S?-T?} du sprint en cours.
- réutiliser ContextHelp, OnboardingStatus, patterns existants
- i18n dans messages/{fr,en,es}.json
- diff minimal, pas de refactor hors scope
- mettre à jour le statut du ticket dans ux-roadmap-sprints.md quand c’est fait
```

---

*Dernière mise à jour : clôture S1–S4 — labels setup, aide brief/CTA/Topic DNA/mix lot, éditeur accordéons + lazy.*
