# Matrice UX — pilotage produit (Ultra Content Maker)

Document de référence pour tickets Cursor, epics et sprints.  
Dernière sync code : S1–S4 clôturés (onboarding, aide contextuelle, legacy, éditeur/bibliothèque).

---

## Roadmap sprints

Voir **`docs/ux-roadmap-sprints.md`** — plan par sprint avec tickets, fichiers, prompts Cursor.

## Epics

| Epic | Tickets | Objectif |
|------|---------|----------|
| **A — Activation & gating** | UX-01, UX-02, UX-03 | Onboarding-first, pas de création “à vide” |
| **B — Refonte profil** | UX-03, UX-04 | Profil en 3 niveaux, champs obligatoires |
| **C — Reveal Persona** | UX-05, UX-07 | Moment “wow” + aide contextuelle |
| **D — Création guidée** | UX-06, UX-09 | Assistant, pas page d’options |
| **E — Pilotage éditorial** | UX-08, UX-11, UX-12 | Bibliothèque, actu, éditeur |

---

## Matrice détaillée

| ID | Problème | Impact | Décision | UI | Logique | Pages | P | Statut |
|----|----------|--------|----------|-----|---------|-------|---|--------|
| UX-01 | Arrivée trop tôt en création | Confusion valeur | Gating onboarding-first | Hub `/start` + progression | `OnboardingStatus`, guards | `/start`, `/articles/new`, setup | P0 | **Fait** |
| UX-02 | Création sans profil/persona | Brief abstrait | Expliquer avant génération | Message contextuel création | Modes dégradés si incomplet | `/articles/new` | P0 | **Fait** |
| UX-03 | Setup non hiérarchisé | Tout semble obligatoire | Indispensable vs optionnel | Labels Obligatoire / Optionnel | Métadonnées complétion | setup, persona | P0 | **Fait** |
| UX-04 | Profil lourd | Abandon | Essential / Voice / Inspirations | Onglets + hints | Chargement par onglet | `/setup/author` | P0 | **Fait** |
| UX-05 | Persona peu valorisée | Faible “wow” | Reveal central | Cartes synthèse + CTA valider | `personaValidated` | `/persona` | P0 | **Fait** |
| UX-06 | Wizard dense | Charge cognitive | Une décision à la fois | Accordéons aide avancée | `creationMode` par étape | `/articles/new` | P0 | **Fait** |
| UX-07 | Termes opaques | Confusion | Aide légère | Tooltips Persona, lot, scope… | `ContextHelp` | Global | P1 | **Fait** |
| UX-08 | Bibliothèque technique | Posts perdus | Espace pilotage | Recherche, filtres, lots | Statuts + sessions | `/articles` | P1 | **Fait** |
| UX-09 | Créer vs Retravailler flou | Hésitation | Chemins distincts | CTA + `?rework=` | Rework depuis bibliothèque | articles | P1 | **Fait** |
| UX-10 | Legacy `clients` | Incohérence | Neutraliser | Pas de liens nav | Redirect middleware + pages | `/clients*` | P1 | **Fait** |
| UX-11 | Actu périphérique | Complexité early | Mode secondaire | `?mode=news` | Fallback si incomplet | news, new | P2 | **Fait** |
| UX-12 | Éditeur chargé | Surcharge | Actions groupées | Sections CTA / repurpose | Chargement à la demande | `/articles/[id]` | P2 | **Fait** |

---

## Tickets 1–3 (socle)

### Ticket 1 — Onboarding guard global

**Fichiers :** `onboarding-status.ts`, `onboarding-guard.tsx`, `onboarding-route-guard.tsx`, `layout.tsx`

**Règles :**
- `!hasApiKey` → `/setup/llm`
- `!hasProfileMinimum` → `/setup/author?tab=essential`
- `!hasAudience` → `/setup/audience`
- `!personaValidated` → `/persona`
- Prêt sans 1er post → `/start/ready`
- Complet → `/articles/new`

### Ticket 2 — OnboardingStatus

**Fichier :** `src/lib/workspace/onboarding-status.ts`  
**Consommateurs :** contexte progress, guards, `/start`, nav home href

### Ticket 3 — Hub `/start`

**Fichier :** `welcome-screen.tsx`  
**Blocs :** prochaine action, étapes complétées, CTA unique, stepper

---

## Prompt Cursor (bloc suivant)

```text
Implémenter UX-02 : message contextuel sur /articles/new si setup récent,
et champs profil obligatoires (UX-04 ticket 4) : LinkedIn URL, rôle,
positionnement, langue avant de marquer author complete.
```
