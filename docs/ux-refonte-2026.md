# Refonte UX Ultra Content Maker (2026)

## Workflow cible

1. Entrée dans l’app  
2. Onboarding guidé  
3. Première génération  
4. Affinage  
5. Bibliothèque / réutilisation  

## Parcours utilisateur

| Étape | Écran | Décision |
|-------|--------|----------|
| 1 | Welcome / onboarding | Promesse en 3 points |
| 2 | Clé API | Obligatoire avant création |
| 3 | Profil + cible | Champs essentiels d’abord |
| 4 | Persona | Montrer ce que l’IA a compris |
| 5 | Création guidée | Un parcours visible à la fois |
| 6 | Bibliothèque | Trier, retravailler |

## Chantiers

1. **Onboarding obligatoire** — guards + completion state  
2. **Navigation** — Accueil / Créer / Bibliothèque / Profil / Réglages  
3. **`/articles/new`** — wizard progressif (intent → brief → gen → result)  
4. **`/setup/author`** — Essentiel / Voix / Inspirations  
5. **Aide contextuelle** — tooltips Persona, Topic DNA, etc.  
6. **Bibliothèque** — recherche, filtres, statuts, lots  

## Cartographie code (état actuel)

| Zone | Fichiers |
|------|----------|
| Complétion setup | `src/lib/workspace/onboarding-progress.ts` |
| Contexte | `src/contexts/onboarding-progress-context.tsx` |
| Stepper | `src/components/onboarding/onboarding-stepper.tsx` |
| Garde | `src/components/onboarding/onboarding-guard.tsx` |
| Progress partagé | `src/components/onboarding/setup-progress.tsx` |
| Création | `src/components/articles/article-creation-wizard.tsx` |
| Nav | `src/components/dashboard-shell.tsx` |
| Layout dashboard | `src/app/[locale]/(dashboard)/layout.tsx` |

## Phases d’exécution

### Phase 1 — Fondations

- [x] `SetupCompletion` + `loadSetupCompletion`  
- [x] `canAccessCreation` / redirect  
- [x] `OnboardingGuard` sur `/articles/new`  
- [x] `SetupProgress` (alias stepper)  
- [x] Nav conditionnelle (badges)  

### Phase 4 — Navigation & profil

- [x] Nav Accueil / Créer / Bibliothèque / Profil / Réglages  
- [x] Badges d’attention sur items incomplets  
- [x] `/setup/author` onglets Essentiel / Voix / Inspirations  
- [x] Redirection `/setup/inspirations` → author?tab=inspirations  

### Phase 2 — Premier usage

- [x] Welcome `/start`  
- [x] Bannières « Étape X sur Y » sur setup + Persona  
- [x] Écran « Vous êtes prêt » `/start/ready`  
- [x] Landing post-login via `onboarding-routes`  
- [ ] Premier post intégré au wizard (Phase 3)  

### Phase 3 — Création guidée

- [x] State machine `intent → briefing → generation → result`  
- [x] Un seul parcours visible après intention (résumé + changement d’intention)  
- [x] Panneau repliable « Pourquoi cette recommandation ? »  
- [x] Thématiques en drawer optionnel  
- [x] Retravailler un post → bibliothèque  

### Phase 5 — Bibliothèque

- [x] Recherche texte (accroche, corps, brief)  
- [x] Filtres statut (tous / à publier / brouillon / affinage / validé)  
- [x] Filtres portée (généraliste / niche)  
- [x] Compteur de résultats + lots datés  
- [x] Aide contextuelle Persona (backlog)  

### Phase 4–5 — Profil avancé

Voir backlog produit initial.

## Branche de travail

`ux-onboarding-refactor`
