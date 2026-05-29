# Reset & suppression des données — spec

**Date :** 2026-05-29  
**Statut :** implémenté (sans multi-profils)

---

## Objectif

Sur la page **Réglages** (`/setup/llm`), deux actions distinctes :

| Action | Effet | Clé API |
|--------|-------|---------|
| **Recommencer mon profil** | Efface identité, Persona, inspirations, bibliothèque ; remet l’onboarding au profil auteur | **Conservée** |
| **Effacer toutes mes données** | Efface tout le workspace Firestore (y compris clé API) | **Supprimée** |

Multi-profils : **hors scope** (éventuel modèle payant ultérieur).

---

## Données effacées

### Reset profil

- `author`, `audience`, `persona`, `sources`, `articles`, `personaHistory`, `learning`, `enrichment`, `ctas`, `newsArchive`, `insights`
- `setupStep → author`

### Suppression totale

- Tout ce qui précède + `llm/profile` + `clients/*` (legacy)
- `setupStep → llm`

---

## API

- `POST /api/workspace/reset-profile` — Bearer token Firebase
- `POST /api/workspace/delete-data` — Bearer token Firebase

Exécution côté serveur (Firebase Admin) pour suppression fiable des collections.

---

## UI

Section « Gestion des données » en bas de Réglages, zone repliable, confirmations explicites (saisie `EFFACER` pour suppression totale).
