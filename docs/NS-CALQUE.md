# NS Calque — Design system NS Suite

Guide complet pour appliquer le même design, ton et structure à toutes les apps **NS Suite** (NextStep Services).  
Source de vérité code : package **`@ns-suite/ui`** (`packages/@ns-suite/ui`).

---

## Table des matières

1. [Vision & positionnement](#1-vision--positionnement)
2. [Stack technique](#2-stack-technique)
3. [Installation du package](#3-installation-du-package)
4. [Palette & tokens couleur](#4-palette--tokens-couleur)
5. [Typographie](#5-typographie)
6. [Grille, espacements & rayons](#6-grille-espacements--rayons)
7. [Composants & classes utilitaires](#7-composants--classes-utilitaires)
8. [Layout application](#8-layout-application)
9. [Landing & marketing](#9-landing--marketing)
10. [Navigation & menus](#10-navigation--menus)
11. [Pied de page](#11-pied-de-page)
12. [Internationalisation](#12-internationalisation)
13. [Ton rédactionnel & wording](#13-ton-rédactionnel--wording)
14. [Responsive & accessibilité](#14-responsive--accessibilité)
15. [Intégration dans une nouvelle app](#15-intégration-dans-une-nouvelle-app)
16. [Prompt maître (IA / brief design)](#16-prompt-maître-ia--brief-design)
17. [Checklist avant mise en prod](#17-checklist-avant-mise-en-prod)

---

## 1. Vision & positionnement

| Élément | Valeur |
|--------|--------|
| **Éditeur** | NextStep Services |
| **Écosystème** | **NS Suite** — apps métier pour entrepreneurs et organisations mid-market (gain de temps, réduction des coûts, workflows ciblés) |
| **Calque design** | **NS Calque** (implémenté dans `@ns-suite/ui`) |
| **Philosophie** | **Swiss-Tech** : ~80 % surfaces claires, ~15 % structure ardoise/charbon, ~5 % accent lime |
| **Marque produit** | **NsMark** : carré `#9DC41A`, texte **NS** noir, `font-black` |
| **Nom produit** | MAJUSCULES (ex. `ULTRA CONTENT MAKER`) — constante par app : `PRODUCT_NAME` |
| **Hub suite** | `NEXT_PUBLIC_NS_SUITE_URL` (portail NS Suite, optionnel) |

**Promesse UX** : outil professionnel, sobre, scannable — pas de gradient violet « SaaS générique », pas de dark mode par défaut.

---

## 2. Stack technique

| Couche | Choix NS Suite |
|--------|----------------|
| Framework | Next.js 16+ (App Router) |
| UI | React 19 |
| Styles | Tailwind CSS 4 (`@import "tailwindcss"`) |
| i18n UI | next-intl 4 (`en`, `fr`, `es`, préfixe URL obligatoire) |
| Police | **Inter** (`next/font/google`, variable `--font-inter`) |
| Déploiement | Vercel (recommandé) |
| Package design | `@ns-suite/ui` (monorepo ou npm privé) |

---

## 3. Installation du package

### Dans le monorepo Ultra Content Maker

Le package vit déjà dans `packages/@ns-suite/ui`. L’app racine dépend de :

```json
"workspaces": ["packages/@ns-suite/*"],
"dependencies": {
  "@ns-suite/ui": "workspace:*"
}
```

### Dans une **nouvelle** app Next.js (même monorepo)

1. Copier ou référencer `packages/@ns-suite/ui`.
2. Ajouter la workspace et la dépendance `workspace:*`.
3. Configurer Tailwind + transpilation :

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "@ns-suite/ui/theme.css";

@theme inline {
  --font-sans: var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif;
}

:root {
  color-scheme: light;
}

body {
  background: var(--color-ns-background);
  color: var(--color-ns-tertiary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

```ts
// next.config.ts
const nextConfig = {
  transpilePackages: ["@ns-suite/ui"],
};
```

```tsx
import { BTN_PRIMARY, NsMark, PAGE_TITLE } from "@ns-suite/ui";
import {
  DashboardPageShell,
  DashboardPageHero,
  NsAppFooter,
  NsLanguageSwitcher,
} from "@ns-suite/ui/components";
```

### Exports du package

| Import | Contenu |
|--------|---------|
| `@ns-suite/ui` | Tokens + brand + components |
| `@ns-suite/ui/tokens` | Classes Tailwind (`BTN_PRIMARY`, `INPUT_CLASS`, …) |
| `@ns-suite/ui/brand` | `NsMark`, `NEXTSTEP_COMPANY`, `NS_SUITE_URL` |
| `@ns-suite/ui/components` | Footer, language switcher, dashboard layout, context help |
| `@ns-suite/ui/theme.css` | `@theme` couleurs Tailwind v4 |

---

## 4. Palette & tokens couleur

### Valeurs hex (référence)

```ts
export const NS = {
  primary: "#9DC41A",    // lime — CTA, liens actifs, NsMark
  secondary: "#6B8FA8",  // ardoise — meta, accents secondaires
  tertiary: "#3D5166",   // texte principal
  hero: "#1A1A1A",       // header, sidebar, hero marketing
  brandLight: "#F8F9FA", // fonds doux
  alternate: "#D9D9D9",  // bordures champs
  background: "#FFFFFF",
};
```

### Classes Tailwind

| Token | Usage |
|-------|--------|
| `ns-primary` | Boutons primaires, états actifs nav, pastilles |
| `ns-secondary` | Texte secondaire, bordures « niche » |
| `ns-tertiary` | Titres et corps principaux |
| `ns-hero` | Barre nav, sidebar, fond landing |
| `ns-brand-light` | Cartes soft, footer light, sections muted |
| `ns-alternate` | Bordures inputs et chips |
| `ns-surface` | Fond cartes / inputs |
| `ns-background` | Fond page |

### Règles d’usage

- **CTA primaire** : `bg-ns-primary` + **`text-black`** (jamais blanc sur lime).
- **Sur fond hero** : texte `text-white`, liens `hover:text-ns-primary`.
- **État actif nav** : `bg-ns-primary/15 text-ns-primary` + ring inset lime léger.
- **Erreurs UI** : palette rose (`rose-50`, `rose-200`, `rose-900`) — pas rouge système brut.
- **Pas de dark mode** : `color-scheme: light` uniquement.

---

## 5. Typographie

| Rôle | Classes | Exemple |
|------|---------|---------|
| Titre page (dashboard) | `PAGE_TITLE` | `text-2xl md:text-3xl font-black uppercase tracking-tighter text-ns-tertiary` |
| Titre section | `SECTION_TITLE` | `text-base font-black uppercase tracking-tight` |
| Meta / nav / eyebrow | `META_LABEL` | `text-[10px] font-black uppercase tracking-widest text-ns-secondary` |
| Sous-titre page | `DASHBOARD_PAGE_DESC` | `text-sm md:text-base font-medium leading-relaxed text-ns-secondary` |
| Corps | `BODY_TEXT` / `BODY_TEXT_DARK` | `text-sm font-medium leading-relaxed` |
| Hero marketing | — | `text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight` (sentence case OK) |
| CTA compact | — | `text-xs font-black uppercase tracking-widest` |

**Principe** : structure en **petites capitales espacées** ; bénéfices marketing en phrases plus grandes et lisibles.

---

## 6. Grille, espacements & rayons

| Zone | Valeur |
|------|--------|
| Contenu dashboard | `max-w-5xl` centré, `px-4 py-8 md:px-6` |
| Admin / tableaux larges | `max-w-[1400px]` (exception documentée) |
| Landing texte | `max-w-4xl` |
| Footer | `max-w-5xl` |
| Sidebar desktop | `w-56`, visible `lg+` |
| Stack vertical page | `DASHBOARD_PAGE_STACK` = `space-y-8 pb-10` |
| Formulaires | `space-y-6` (compact : `space-y-4`) |
| Cartes | `rounded-2xl`, padding `p-4 md:p-6` |
| Contrôles | `rounded-lg`, boutons `min-h-11` (44px touch) |
| Chips / switcher langue | `rounded-sm` |

**Bordures** : `border-gray-100` sur fond clair ; `border-ns-alternate` sur formulaires ; accent liste `border-l-[5px] border-l-ns-primary`.

---

## 7. Composants & classes utilitaires

Tous exportés depuis `@ns-suite/ui/tokens` :

| Token | Rôle |
|-------|------|
| `PAGE_BG` | Fond page min-height |
| `CARD` / `CARD_SOFT` / `CARD_INTERACTIVE` | Cartes statiques, douces, cliquables |
| `LABEL_CLASS` / `INPUT_CLASS` | Formulaires |
| `BTN_PRIMARY` / `BTN_PRIMARY_SM` / `BTN_PRIMARY_LG` | Actions principales |
| `BTN_SECONDARY` / `BTN_SECONDARY_ON_DARK` | Secondaire clair / sur hero |
| `BTN_GHOST` | Lien texte |
| `CHIP` / `CHIP_ACTIVE` | Sélections |
| `ERROR_TEXT` | Validation inline |
| `SCOPE_CARD_GENERALIST` / `SCOPE_CARD_NICHE` | Bordure gauche accent |

### Composants React (`@ns-suite/ui/components`)

| Composant | Description |
|-----------|-------------|
| `NsMark` | Logo NS |
| `NsAppFooter` | Pied de page (props `labels` + `Link`) |
| `NsLanguageSwitcher` | FR / EN / ES (props `onLocaleChange`) |
| `DashboardPageShell` | Conteneur `space-y-8` |
| `DashboardPageHero` | Variants `gradient` \| `card` |
| `DashboardPageSection` | Panel `default` \| `muted` |
| `DashboardPageLoading` / `DashboardPageError` | États page |
| `ContextHelp` | Bouton `?` + panneau `details` |

### Sélection binaire (pattern traductions / options)

```tsx
// Actif
"rounded-lg border border-ns-primary bg-ns-primary/15 text-ns-tertiary"
// Inactif
"rounded-lg border border-gray-200 bg-white text-ns-tertiary hover:border-ns-primary/50"
```

---

## 8. Layout application

### Structure desktop (`lg+`)

```
┌──────────────┬────────────────────────────────────┐
│ Sidebar      │ Header sticky (bg-ns-hero)         │
│ w-56         ├────────────────────────────────────┤
│ bg-ns-hero   │ <main> max-w-5xl                   │
│ Logo + nom   │   DashboardPageShell               │
│ Compte*      │     DashboardPageHero (gradient)     │
│ Langue       │     DashboardPageSection × n         │
│ Déconnexion  │                                    │
└──────────────┴────────────────────────────────────┤
               │ AppFooter variant="light"          │
               └────────────────────────────────────┘
```

### Mobile

- Sidebar masquée ; **header** + menu hamburger.
- Drawer **droite** ~300px, `bg-ns-hero`, overlay `bg-black/50`.
- Fermeture : Escape, clic overlay, changement de route.
- `document.body.style.overflow = hidden` quand menu ouvert.

### Hero page dashboard

**Variant `gradient`** (Accueil, Créer, Profil…) :

- `rounded-2xl border border-ns-primary/20`
- `bg-gradient-to-br from-ns-brand-light via-white to-white`
- Blob décoratif : `bg-ns-primary/15 blur-3xl`

**Variant `card`** (Bibliothèque, listes) :

- Toolbar optionnelle en haut (`border-b`)
- Titre + actions dans le corps

---

## 9. Landing & marketing

1. **Hero** plein écran `bg-ns-hero` + blobs flous primary/secondary.
2. Badge langues : `text-xs font-bold uppercase tracking-widest text-ns-primary` → `FR · EN · ES`.
3. **H1** bénéfice + sous-titre + encadré `border-l-4 border-ns-primary bg-white/5`.
4. CTA : `BTN_PRIMARY_LG` + `BTN_SECONDARY_ON_DARK`.
5. Grille capacités : cartes `rounded-2xl border-gray-100`, icône numérotée dans `bg-ns-primary/15`.
6. Footer **dark** + `showAuthLinks`.

---

## 10. Navigation & menus

### Nav principale (pattern Ultra Content Maker)

| Clé | Label FR | Route type |
|-----|----------|------------|
| home | Accueil | `/start` |
| create | Créer | `/articles/new` |
| library | Bibliothèque | `/articles` (exclure `/articles/new`) |
| profile | Profil | `/setup/author`, persona… |
| settings | Réglages | `/setup/llm` |
| admin | Admin | `/admin/*` (rôle) |

**Style lien header** : `META_LABEL` + actif `bg-ns-primary/15 text-ns-primary`.

**Attention setup** : pastille `h-1.5 w-1.5 rounded-full bg-ns-primary` si étape incomplète.

### Types de menus à réutiliser

| Type | Quand |
|------|--------|
| Nav horizontale + sidebar | App authentifiée multi-sections |
| Stepper / bannière onboarding | `border-ns-primary/20 bg-ns-primary/5` |
| Onglets profil | `rounded-lg border border-ns-alternate bg-ns-brand-light p-1` |
| Drawer mobile | Navigation principale |
| `details/summary` | Aide contextuelle, sections repliables |

---

## 11. Pied de page

Composant : **`NsAppFooter`** avec :

- `companyName` : défaut `NextStep Services`
- `labels.tagline` : « {Produit} : {valeur} — un outil NS Suite pour les entrepreneurs. »
- `labels.rights` : `© {year} NextStep Services`
- Liens optionnels : accueil app, bibliothèque, login, signup

**Variants** :

- `dark` : landing / auth (`bg-ns-hero`)
- `light` : dashboard (`bg-ns-brand-light`)

---

## 12. Internationalisation

| Paramètre | Valeur |
|-----------|--------|
| Locales UI | `en`, `fr`, `es` |
| Préfixe URL | Toujours (`/fr/...`) |
| Locale par défaut | `en` |
| Fichiers messages | `messages/{en,fr,es}.json` |
| Switcher | `NsLanguageSwitcher` + logique locale dans l’app |

### Structure JSON recommandée

```json
{
  "app": { "name", "tagline", "footer": {} },
  "nav": { "home", "create", "library", "profile", "settings", "signOut" },
  "errors": { "codes", "hints", "report" },
  "landing": { "hero", "product", "capabilities" }
}
```

**Contenu métier** (ex. variantes régionales de posts) : clés séparées de l’UI (`es-mx`, `en-gb`, etc.).

---

## 13. Ton rédactionnel & wording

### Principes

- **Français professionnel** : impératifs clairs (« Configurez », « Générez », « Copiez »).
- **Concret** : chiffres, étapes, limites (« 4 brouillons », « pas de publication automatique »).
- **Transparence IA** : clé utilisateur, crédits, rate limits — pas de promesse magique.
- **Nav courte** : 1 mot quand possible.
- **Nom produit** : CAPS dans le header ; phrases marketing en casse normale.

### Formules types

- Sous-titre : « … — respect du format {contrainte métier}. »
- Hint : une phrase, `text-xs text-ns-secondary`.
- Sections numérotées : `1. Langue cible` / `2. Style de traduction`
- Erreur : problème + **action** (« Réglages → Clé API »)

### À éviter

- Emojis dans l’UI pro (sauf exception marketing)
- Clichés LinkedIn / IA (« game changer », « ravi de partager »)
- Texte blanc sur boutons lime
- Nouvelle palette (violet, bleu startup par défaut)

---

## 14. Responsive & accessibilité

- **Mobile-first** ; nav drawer `< lg`.
- **Touch targets** ≥ 44px (`min-h-11`).
- **Focus visible** : ring `ns-primary/80` sur boutons (tokens `BTN_*`).
- **Texte responsive** : `text-2xl md:text-3xl`, grilles `sm:` / `lg:`.
- **Contenu long** : `line-clamp`, `flex-wrap` sur toolbars.
- **Aide** : `aria-label` sur `?` ; `role="radiogroup"` sur sélecteurs.
- **Contraste** : texte principal `#3D5166` sur blanc ; lime réservé aux accents et CTA.

---

## 15. Intégration dans une nouvelle app

### Checklist fichiers

- [ ] Dépendance `@ns-suite/ui`
- [ ] `globals.css` + `theme.css`
- [ ] `transpilePackages: ["@ns-suite/ui"]`
- [ ] Inter dans `layout.tsx`
- [ ] `messages/*.json` (app, nav, errors, footer)
- [ ] Wrapper `AppFooter` → `NsAppFooter` + `Link` i18n
- [ ] Wrapper `LanguageSwitcher` → `NsLanguageSwitcher`
- [ ] Shell dashboard (copier pattern `dashboard-shell.tsx` ou extraire plus tard dans le package)
- [ ] `PRODUCT_NAME` local dans `lib/brand/product.ts`

### Fichiers de référence (Ultra Content Maker)

| Fichier | Rôle |
|---------|------|
| `packages/@ns-suite/ui/` | Package |
| `src/components/dashboard-shell.tsx` | Shell complet (reste app-specific pour l’instant) |
| `src/lib/navigation/dashboard-nav.ts` | Config nav |
| `src/components/landing/landing-page.tsx` | Marketing |
| `messages/fr.json` | Ton FR |

---

## 16. Prompt maître (IA / brief design)

Copier-coller et remplacer `[NOM APP]` / `[FONCTIONNALITÉS]` :

```markdown
Tu construis une app Next.js 16 + React 19 + Tailwind 4 + next-intl pour NextStep Services,
écosystème NS Suite (outils gain de temps / réduction de coûts, entrepreneurs et mid-market).

Utilise le package @ns-suite/ui (NS Calque) :
- Couleurs : ns-primary #9DC41A, ns-hero #1A1A1A, ns-tertiary #3D5166, ns-brand-light #F8F9FA
- Style Swiss-Tech : 80% clair, 15% charbon, 5% lime
- Police Inter ; titres dashboard uppercase font-black
- CTA : bg-ns-primary text-black min-h-11 rounded-lg
- Layout : header ns-hero sticky, main max-w-5xl, footer light avec mention NS Suite
- Composants : NsMark, DashboardPageHero (gradient|card), NsAppFooter, NsLanguageSwitcher
- i18n : fr, en, es avec préfixe URL
- Ton : professionnel, concret, transparent sur l'IA, pas de hype creux

Nom produit : [NOM APP EN MAJUSCULES]
Fonctionnalités : [FONCTIONNALITÉS]

Ne pas inventer une nouvelle palette. Ne pas utiliser de dark mode. Ne pas mettre de texte blanc sur les boutons lime.
```

---

## 17. Checklist avant mise en prod

- [ ] `@ns-suite/ui/theme.css` importé une seule fois
- [ ] Tous les CTA primaires en `text-black` sur `ns-primary`
- [ ] Footer mentionne NS Suite + NextStep Services
- [ ] Locales `en` / `fr` / `es` complètes pour nav + erreurs
- [ ] Menu mobile fermable au clavier
- [ ] Build Next OK avec `transpilePackages`
- [ ] Pas de couleurs hors tokens sans justification documentée

---

## Historique

| Version | Date | Notes |
|---------|------|--------|
| 0.1.0 | 2026 | Extraction depuis Ultra Content Maker → `@ns-suite/ui` |

---

*NextStep Services · NS Suite · NS Calque*
