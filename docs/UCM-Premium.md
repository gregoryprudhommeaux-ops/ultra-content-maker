# UCM-Premium — Monétisation & roadmap Ultra Content Maker

Document de référence unique : synthèse des échanges stratégiques (persona **Jerry-AI-SaaS-Expert**, Fractional CPO / AI SaaS) et décisions fondateur validées.  
Sert de guide pour **vision produit**, **technique**, **design**, **marketing** et **développement**.

**Statut** : validé côté pricing + relecture fondateur (mars 2026) — implémentation à planifier.  
**Produit** : Ultra Content Maker (UCM) — Next.js, Firebase, BYOK, i18n fr/en/es.  
**Pré-launch** : voir §13 (copy public, aha Free, test 29 € vs 39 €, beta fondateur).

---

## 1. Résumé exécutif

UCM passe d’un outil **100 % BYOK sans plafond produit** à un modèle **Free limité + Pro payant**, centré sur les **solo entrepreneurs** qui veulent publier sur LinkedIn **régulièrement** sans déléguer toute leur valeur à un freelance.

**Décisions clés validées**

| Thème | Décision |
|-------|----------|
| Prix Pro | **39 € / mois** |
| Annuel | **Oui** — **374 € / an** (-20 %, ~31 €/mois) |
| Quota Free | **2 brouillons / mois** (1ʳᵉ génération, 1 post/session) |
| Quota Pro | **16 brouillons / mois** |
| Regen / rework | **Pro uniquement** |
| API | **BYOK** Free et Pro (pas de crédits hébergés en V1) |
| Profils | Free : **1** · Pro : **jusqu’à 3** |
| Reset profil Free | **Illimité** |
| Actu | Free : **1 essai à vie** · Pro : illimité (fair use) |
| Persona Free | Synthèse visible · pas prompt complet/copie · édition manuelle **1×/mois** · **pas** sync feedback posts |
| Persona Pro | Complet + historique + sync feedback + scan LinkedIn |

**Promesse une ligne**  
*Publier sur LinkedIn avec votre expertise, sans y passer des heures à faible valeur — ni un freelance à chaque post.*

**Verdict fondateur (§13)** : plan **lançable** — ne pas refaire l’architecture ; affûter discours public, parcours aha Free et sensibilité prix avant Stripe.

---

## 2. Vision & positionnement

### 2.1 Ce que UCM vend (et ne vend pas)

| Vend | Ne vend pas |
|------|-------------|
| Réduction de friction business (régularité, structure, voix) | « De l’IA » ou un chat générique |
| Content Brain (Persona + brief + workflow → export LinkedIn) | Une prompt à copier-coller vers ChatGPT |
| Prévisibilité vs freelance ponctuel sur un **job précis** | Un outil pour tout le monde |
| Cadre produit + discipline éditoriale | Génération illimitée sans limite coût/comportement |

### 2.2 ICP (Ideal Customer Profile)

**Cible principale** : solo entrepreneur / indépendant / consultant qui :

- vend déjà une **expertise, un service ou un accompagnement** ;
- doit être **visible et régulier** sur LinkedIn ;
- veut garder la main sur sa **valeur métier** ;
- cherche à **réduire** temps, charge mentale ou coût sur des tâches autrefois confiées à un **freelance** (ghostwriting, veille, reformulation).

**Quatre traits** (Jerry) : peu de temps · faible tolérance à la complexité · besoin de bénéfice rapide · fort ratio valeur/prix.

**Anti-ICP** : « quelqu’un qui aime l’IA » sans enjeu de publication pro.

### 2.3 Alignement fondateur

Construire des **solutions niches pour solo entrepreneurs** : se concentrer sur la **création de valeur client**, automatiser l’**opérationnel non différenciant** (ex. production LinkedIn structurée).

### 2.4 Positionnement vs alternatives

| Alternative | Réponse UCM |
|-------------|-------------|
| ChatGPT seul | Persona + brief + quality + export en un flux |
| Freelance ponctuel | Pro ≈ coût prévisible pour **régularité** (16 posts/mois) |
| Outil généraliste | Surface petite, bénéfice précis, LinkedIn-native |
| Facture IA imprévisible | BYOK = contrôle fournisseur ; abo Pro = prix fixe outil |

---

## 3. Grille tarifaire validée

### 3.1 Comparaison Free / Pro

| | **Free** | **Pro** |
|---|:---:|:---:|
| **Prix** | 0 € | **39 € / mois** |
| **Annuel** | — | **374 € / an** (~31 €/mois, -20 %) |
| **Clé API (BYOK)** | Obligatoire | Obligatoire |
| **Brouillons / mois** | 2 | 16 |
| **Posts par génération** | 1 | 1 |
| **Regénération / rework** | Non | Oui |
| **Depuis mon profil** | Oui | Oui |
| **Depuis une inspiration** | Oui (quota commun) | Oui |
| **Depuis l’actualité** | 1 essai à vie | Oui (fair use) |
| **Profils** | 1 | Jusqu’à 3 |
| **Reset profil** | Illimité | Illimité |
| **Persona — synthèse** | Visible | Visible |
| **Persona — prompt & copie** | Non | Oui |
| **Persona — historique** | Non | Oui |
| **Persona — édition manuelle** | 1× / mois | Illimitée |
| **Persona — sync posts / feedback** | Non | Oui |
| **Analyse LinkedIn & stratégie** | Non | Oui |
| **Bibliothèque & rework** | Basique | Complète |
| **Affiner, Quality, Slop** | Limité | Complet |
| **CTA + export LinkedIn** | Oui | Oui |
| **Traduction, repurpose, illustration** | Non | Oui |

### 3.2 Définitions produit (FAQ — à afficher)

**Brouillon** = une **première génération** comptée dans le mois civil (événement au premier appel « generate » réussi du mois, par compte).

**Ne compte pas** (Free) : regen, rework, affinages multiples consommant un nouveau « slot » — **regen/rework = Pro**.

**Quota Free partagé** : profil + inspiration consomment les **2** brouillons (ex. 1 profil + 1 inspiration = 2/2).

**Essai actu** : **1 fois par compte** (lifetime), pas 1/mois.

**Reset profil illimité (Free)** : choix fondateur — généreux sur le setup ; le quota **2 brouillons/mois reste global au compte**, pas par profil → limite l’abus multi-niche gratuite.

**Fair use Pro** : usage professionnel normal ; pas revente, partage de compte, abus automatisé.

---

## 4. Cartographie fonctionnelle (état actuel → gates)

Référence arborescence actuelle :

```
/ → landing (fr, en, es)
/start → onboarding hub
/setup/llm → setup/author → setup/audience → /persona → /start/ready
/articles/new → wizard (profil | actu | inspiration)
/articles → bibliothèque
/articles/[id] → éditeur
```

### 4.1 Matrice feature × plan

| Zone produit | Feature existante (indicatif) | Free | Pro |
|------------|-------------------------------|------|-----|
| **Setup** | LLM BYOK, auteur, audience | Oui | Oui |
| **Persona** | Reveal / cartes synthèse | Oui | Oui |
| **Persona** | Prompt texte complet, copie | Non | Oui |
| **Persona** | Historique, restore | Non | Oui |
| **Persona** | Affinage manuel (champ) | 1×/mois | Illimité |
| **Persona** | Sync feedback posts / validate | Non | Oui |
| **Persona** | Insights / synthèse perf | Non | Oui |
| **Création** | Mode profil | Oui | Oui |
| **Création** | Mode inspiration | Oui | Oui |
| **Création** | Mode actu | 1 essai vie | Oui |
| **Création** | Batch 4 posts | Non | Phase 2 / option |
| **Création** | Stratégie LinkedIn / scan | Non | Oui |
| **Création** | Génération | 2/mois, 1 post | 16/mois |
| **Éditeur** | CTA + validate + export | Oui | Oui |
| **Éditeur** | Affiner (refinement) | Limité | Complet |
| **Éditeur** | Regen brouillon | Non | Oui |
| **Éditeur** | Quality + Slop | Limité | Complet |
| **Éditeur** | Format, traduction, repurpose, illus. | Non | Oui |
| **Bibliothèque** | Liste, filtres, lots | Basique | Complet |
| **Bibliothèque** | Rework `?rework=` | Non | Oui |
| **Compte** | Multi-profils | 1 | 3 |

### 4.2 Paywalls UX (moments de conversion)

1. **2/2 brouillons** — CTA upgrade avant génération.
2. **Regen / rework** — modal Pro.
3. **2ᵉ essai actu** — après essai lifetime.
4. **Copie / prompt Persona complet** — teaser + Pro.
5. **2ᵉ édition Persona manuelle** dans le mois.
6. **Création 2ᵉ profil** ou profil #2/#3.
7. **Clic stratégie LinkedIn** (scan).

---

## 5. Principes Jerry (garde-fous décision)

À relire avant tout ticket produit :

1. Le client achète une **friction en moins**, pas l’IA.
2. Le gratuit **prouve la valeur**, il n’absorbe pas les coûts de tous.
3. Limite = **métrique de valeur** (brouillons/mois), pas features arbitraires seules.
4. Paywall sur ce qui est **coûteux** (actu, Perplexity, scan) ou **différenciant** (Persona vivant, multi-profils).
5. Free doit permettre **time-to-first-validated-post** < ~30 min.
6. Ne pas lancer Premium / add-ons avant preuve **Free → Pro**.

**Voix interne (citations)**  
- « Le client n’achète pas l’IA ; il achète une friction en moins dans son business. »  
- « Le gratuit doit prouver la valeur, pas absorber les coûts de tout le monde. »  
- « Un bon produit niche est petit en surface, très précis en bénéfice. »  
- « Si tu remplaces parfois un freelance, sois plus cadré, plus rapide et plus prévisible sur un job précis. »

---

## 6. Roadmap — Vision produit

### Phase 0 — Cadrage (fait en discussion)

- [x] Grille Free / Pro validée
- [x] Value metric : brouillons/mois
- [x] BYOK conservé V1
- [ ] Page pricing + FAQ publiée
- [ ] Spec technique compteurs + plans

### Phase 1 — Monétisation MVP (P0)

**Objectif** : faire respecter les limites Free et vendre Pro.

- Billing Stripe (Checkout + Customer Portal)
- Plans `free` | `pro` + statut abonnement
- Compteurs mensuels : `draftGenerationsUsed`, reset calendaire
- Flags : `actuTrialUsed`, `personaManualEditsThisMonth`
- Gates serveur sur routes `/api/articles/*`, `/api/persona/*`, `/api/linkedin/*`
- Paywalls UI (compteur, modales, pages `/pricing`)
- Email : confirmation Pro, reset usage mensuel

### Phase 2 — Packaging Pro complet (P1)

- Multi-profils (1 → 3) + sélecteur global
- Persona : masquage prompt Free, copie Pro
- Désactivation sync feedback Persona en Free
- Bibliothèque + rework Pro
- Actu : gate post-essai

### Phase 3 — Polish & growth (P2)

- Page annuelle -20 %
- Onboarding upgrade (post 1er post validé)
- Métriques dashboard fondateur
- A/B prix (29 vs 39) si besoin
- *(Option future)* crédits IA hébergés — **hors scope V1**

---

## 7. Roadmap — Technique

### 7.1 Modèle de données (Firestore — proposition)

```
users/{uid}
  plan: "free" | "pro"
  stripeCustomerId, stripeSubscriptionId
  usage: {
    periodKey: "2026-03"        // YYYY-MM
    draftGenerations: number
    personaManualEdits: number
    actuTrialUsed: boolean
  }
  profiles/{profileId}         // Phase 2 multi-profils
    author, audience refs, personaId, isDefault
```

**Règles**

- Incrément `draftGenerations` **uniquement** sur première génération du mois (idempotence par `generationId` ou flag sur article).
- Reset usage : Cloud Function cron 1er du mois ou lazy check `periodKey`.
- Essai actu : `actuTrialUsed = true` jamais remis à false.

### 7.2 Gates API (priorité)

| Route / action | Gate |
|----------------|------|
| `POST` génération article | quota + plan |
| Regen / rework | `plan === pro` |
| `POST` persona feedback sync | pro |
| Persona manual save | free ≤ 1/mois |
| LinkedIn strategy / creation-strategy | pro |
| Actu suggestions + generate from news | essai ou pro |
| Export prompt persona | pro |

**Principe** : **jamais** faire confiance au seul client — vérifier plan + usage côté **API routes** existantes sous `src/app/api/`.

### 7.3 Billing

- Stripe Products : UCM Pro Monthly (39 EUR), Annual (374 EUR)
- Webhooks : `checkout.session.completed`, `customer.subscription.updated/deleted`
- Mapper `users.plan`
- Portail client : gestion abo / factures

### 7.4 Fichiers code impactés (indicatif)

| Domaine | Fichiers / zones |
|---------|------------------|
| Plan & usage | nouveau `lib/billing/plan.ts`, `lib/billing/usage.ts` |
| API guards | middleware ou helper `requirePlan()` |
| Wizard | `article-creation-wizard.tsx`, modes actu/inspiration |
| Persona | `persona-editor.tsx`, `persona-reveal.tsx`, sync feedback |
| Nav / shell | `dashboard-shell.tsx`, page pricing |
| i18n | `messages/{fr,en,es}.json` — clés `pricing.*`, `upgrade.*` |
| Rules Firestore | `firestore.rules` — lecture plan, écriture usage |

### 7.5 Tests & QA

- Matrice E2E : Free user → 2 gens OK → 3ᵉ bloquée
- Free → regen bloquée
- Actu 1× OK → 2× bloquée
- Pro → 16 gens, regen OK
- Webhook downgrade → retour Free + grace period (à définir)

---

## 8. Roadmap — Design

### 8.1 Livrables design

| Livrable | Description |
|----------|-------------|
| **Page Pricing** | Tableau Free/Pro, FAQ, CTA Stripe, mention BYOK |
| **Compteur usage** | Header ou wizard : « 1/2 brouillons ce mois-ci » |
| **Modales upgrade** | 5–7 variantes (quota, actu, regen, persona, profils) |
| **États Persona Free** | Synthèse visible, prompt flouté / section verrouillée |
| **Badge plan** | Free / Pro dans réglages |
| **Paywall actu** | Après essai : écran explicatif + comparatif |
| **Emails** | Templates confirmation, limite atteinte, renouvellement |

### 8.2 Principes UI

- Upgrade = **bénéfice métier**, pas liste de features techniques
- Toujours montrer **ce qui reste possible** en Free (pas mur opaque)
- Cohérence NS Suite (tokens existants `ns-primary`, etc.)

### 8.3 Parcours critiques à maquetter

1. Fin onboarding → 1ʳᵉ génération (compteur 1/2)
2. 2ᵉ génération même mois → OK
3. 3ᵉ tentative → paywall
4. Persona → édition manuelle 2ᵉ fois dans le mois → paywall
5. Checkout Pro → retour app débloquée

---

## 9. Roadmap — Marketing & commercialisation

### 9.1 Messages par canal

| Canal | Message |
|-------|---------|
| **Landing** | 2 posts gratuits · Pro 16/mois · BYOK |
| **LinkedIn fondateur** | Régularité sans freelance mensuel |
| **Email onboarding** | J0 setup · J3 « publiez votre 1er post » · J7 upgrade si 2/2 |
| **Pricing page** | Tableau validé + FAQ objections |

### 9.2 Séquence upgrade (lifecycle)

1. **Activation** : Persona validé + 1ʳᵉ génération
2. **Aha** : export LinkedIn / post validé
3. **Limite** : 2/2 brouillons ou essai actu consommé
4. **Conversion** : CTA Pro 39 € — essai 7 jours *(option à décider)*

### 9.3 Objections — scripts courts

- **ChatGPT** : « UCM structure votre voix LinkedIn en 30 min, pas 3 h de prompts. »
- **Freelance** : « 39 €/mois vs 200 €+ par post ponctuel pour la même régularité. »
- **BYOK** : « Vous gardez le contrôle des coûts IA ; nous vendons le workflow pro. »

### 9.4 KPI marketing & produit

| KPI | Cible indicative (à calibrer) |
|-----|-------------------------------|
| Activation (Persona validé) | > 40 % signup |
| Time to first validated post | < 7 jours |
| Free → Pro (30 j) | 3–8 % early stage |
| Churn Pro M1 | < 8 % |
| ARPA | 39 € (31 € annualisé) |

### 9.5 Launch checklist

- [ ] Page `/pricing` live (fr/en/es)
- [ ] Stripe prod + TVA
- [ ] Mentions légales / CGV abonnement
- [ ] Bandeau « Beta pricing » si besoin
- [ ] 5 beta users Pro à prix fondateur *(option)*

---

## 10. Roadmap — Développement (tickets suggérés)

### Epic A — Billing & plan (P0)

- A1 Modèle `plan` + Stripe webhook
- A2 Page pricing + Checkout
- A3 Customer portal lien réglages
- A4 Tests webhook + downgrade

### Epic B — Usage & quotas (P0)

- B1 `usage.draftGenerations` + reset mensuel
- B2 Gate génération wizard + API
- B3 UI compteur brouillons
- B4 `actuTrialUsed` + gate actu

### Epic C — Persona gates (P1)

- C1 Masquer prompt / copie Free
- C2 Limite édition manuelle 1/mois
- C3 Désactiver sync feedback Free

### Epic D — Pro features (P1)

- D1 Regen / rework gate
- D2 Multi-profils (max 3)
- D3 LinkedIn strategy Pro-only
- D4 Bibliothèque rework Pro

### Epic E — i18n & polish (P1)

- E1 Clés pricing/upgrade fr/en/es
- E2 Modales upgrade variantes
- E3 Analytics events (upgrade_click, limit_hit)

---

## 11. Ordre d’exécution recommandé

```
Semaine 1–2 : Spec + Stripe + plan Firestore + webhook
Semaine 2–3 : Gates API génération + compteur UI + page pricing
Semaine 3–4 : Actu essai + regen/rework Pro + paywalls
Semaine 4–6 : Persona gates + multi-profils + marketing launch
```

**Ne pas paralléliser** billing et multi-profils sans gates de base — risque de faille quota.

---

## 12. Décisions ouvertes (post-validation)

| Sujet | Options | Recommandation Jerry |
|-------|---------|----------------------|
| Grace period après échec paiement | 3j / 7j / immédiat Free | 3–7 j Pro features |
| Essai Pro 7 jours | Oui / Non | Test A/B plus tard |
| Batch 4 posts | Pro phase 2 | Oui, pas V1 |
| Bibliothèque Free | 30j historique vs lecture seule | Trancher en design |
| Affiner / Quality en Free | 1 passage vs off | 1 passage OK |
| 1 regen par brouillon en Free | Oui / Non | Tester en beta (aha sans +1 brouillon/mois) |
| Prix public figé | 29 € / 39 € / deux offres | A/B + beta fondateur avant figer |
| Copy pricing publique | Matrice complète / 3 blocs transformation | **3 blocs + FAQ repliable** |

---

## 13. Validation fondateur & pré-launch

Synthèse de la relecture stratégique (Jerry-AI-SaaS-Expert + fondateur, mars 2026). Complète les sections 1–12 sans remettre en cause l’architecture pricing.

### 13.1 Ce qui est validé fortement

| Pilier | Pourquoi c’est solide |
|--------|------------------------|
| **2 Free / 16 Pro** | Différence d’**intensité d’usage** réelle ; le gratuit reste utile |
| **Principe « le gratuit prouve la valeur »** | Bien traduit : quotas, BYOK, pas de génération illimitée |
| **Paywalls choisis** | Regen/rework, actu, Persona complet, multi-profils, stratégie LinkedIn = **coûteux ou différenciants** — meilleurs déclencheurs qu’un verrou arbitraire |
| **Moments de conversion** | Upgrade **après** un bénéfice ; cohérent freemium / AI SaaS récents |
| **Ordre d’exécution** | Billing → quotas → paywalls → packaging Pro = lançable |
| **Alignement vision** | Pas un pricing SaaS générique : niche solo, valeur métier, friction business |

**Verdict** : le plan est **bon et lançable**. Ne pas refaire l’architecture ; affûter **discours public**, **parcours aha Free**, **sensibilité prix**.

### 13.2 Fragilités identifiées

#### A. 39 € + BYOK = double friction psychologique

Pour certains solo **early-stage** ou peu matures LinkedIn : effort **clé API** + **abonnement outil** en même temps.

**Pistes (sans abandonner BYOK V1)** :

- Onboarding BYOK le plus court possible (guides provider déjà en place).
- Pricing public : séparer visuellement **« abo UCM »** et **« coût IA chez votre fournisseur »** (souvent quelques €).
- Message : *« 39 € = le workflow pro ; l’IA, vous la réglez chez OpenAI/Anthropic. »*

#### B. 2 brouillons/mois — risque avant l’« aha moment »

Propre pour marge et packaging, mais possiblement **trop court** si l’utilisateur n’atteint pas **time-to-first-validated-post** avant 2/2.

**Risque** : conversion Free → Pro baisse si le mur arrive avant export / validation LinkedIn.

**Métrique beta clé** : % utilisateurs Free avec **≥ 1 post validé** avant épuisement du quota mensuel.

#### C. Densité « matrice features » en langage interne

UCM-Premium convient en **doc interne**. La page pricing publique doit vendre une **transformation**, pas un tableau technique.

### 13.3 Ajustements recommandés (pré-launch)

#### Prix : tester 29 € vs 39 €

| Variante | Rôle |
|----------|------|
| **39 €** | Prix de référence — ancrage valeur (16 brouillons, 3 profils, rework, stratégie LinkedIn) |
| **29 €** | Entrée early-stage — même limites Pro ou quota légèrement réduit (ex. 12/mois) à trancher |
| **Méthode** | Un seul prix public à la fois ; A/B ou cohortes sur 4–8 semaines ; mesurer conversion + churn M1 |

Le doc prévoit déjà un A/B 29 vs 39 — **à exécuter avant de figer le pricing public**.

#### Free plus « activant », pas plus généreux

Garder **2 brouillons/mois**, mais maximiser la probabilité d’aha :

| Garder | Renforcer |
|--------|-----------|
| 2 générations initiales / mois | **CTA + export** sur chaque brouillon (déjà prévu) |
| Pas regen/rework (base validée) | *Option beta* : **1 regen par brouillon** sans compter un 3ᵉ slot |
| Persona synthèse visible | Parcours guidé : setup → Persona → **1ʳᵉ gen profil** → validation |
| Pas prompt complet | *Option* : **Quality ou Slop : 1 passage** sur le 1er post |

**Règle** : ne pas passer à 3–4 brouillons/mois sans data ; préférer **qualité du parcours** au volume gratuit.

**Parcours guidé Free** : éviter de consommer profil + inspiration + essai actu le même mois **sans ordre** — prioriser **1 post validé profil** avant essai actu.

#### Plan fondateur / beta Pro

| Paramètre | Exemple |
|-----------|---------|
| Places | 20–50 max |
| Prix | 29 € à vie ou 12 mois puis 39 € |
| Contrepartie | 2 interviews + feedback (+ témoignage si OK) |
| Objectif | Valider aha, objections BYOK, sensibilité 29 vs 39 **avant** pricing public figé |

### 13.4 Discours commercial public (pricing page)

Structure recommandée — **3 blocs**, pas une matrice de 20 lignes en hero :

1. **Avant** : irrégulier sur LinkedIn, freelance ponctuel, prompts brouillons.
2. **Après** : posts réguliers, votre voix, prêt à publier ; actu et profondeur en Pro.
3. **Plans** : Free « tester » · Pro « publier chaque semaine » — bullets **bénéfice** :
   - jusqu’à **16 brouillons/mois**
   - **3 profils**
   - **rework** et regen
   - **stratégie LinkedIn** incluse

Tableau détaillé (section 3.1) → **FAQ repliable** ou lien « Comparer les offres en détail ».

### 13.5 Avis net (synthèse)

| Dimension | Jugement |
|-----------|----------|
| Logique produit | ✅ Lançable |
| Segmentation & limites | ✅ Crédibles et défendables |
| Alignement vision niches solo | ✅ Fort |
| Architecture à refaire | ❌ Non |
| Avant mise en ligne | ⚠️ Copy public · aha Free · test prix |

**Phrase de synthèse** : le plan monetise l’**intensité** et la **profondeur** (régularité, Persona vivant, actu, multi-profils), pas l’accès à l’IA — cohérent avec BYOK et la promesse « moins de friction business », pas « plus de tokens ».

### 13.6 Priorités avant mise en ligne (checklist)

- [ ] Rédiger pricing public en mode **transformation** (section 13.4)
- [ ] Instrumenter **validated post before quota hit**
- [ ] Lancer **beta fondateur** (20–50 places)
- [ ] A/B ou cohorte **29 € vs 39 €** (4–8 semaines)
- [ ] Trancher option **1 regen Free** selon données beta
- [ ] Puis Epic A (Stripe) — section 10

---

## 14. Annexes

### 14.1 Historique des échanges (chronologie)

1. Clôture roadmaps UX S1–S4 (onboarding, nav, éditeur).
2. Création skill **Jerry-AI-SaaS-Expert** (persona Fractional CPO).
3. Première réflexion Free/Pro : BYOK, value metric brouillons.
4. Affinements fondateur : 2 posts/mois, Persona sans sync feedback, multi-profils Pro, actu payant.
5. Persona : synthèse visible, pas copie prompt ; édition manuelle seule en Free.
6. Validation finale pricing (39 €, 16/mois, BYOK, annuel -20 %, reset illimité, etc.).
7. Document **UCM-Premium** pour roadmaps vision / tech / design / marketing.

### 14.2 Références produit actuel

- BYOK : `llm-setup-form.tsx`, `getUserLlmProfile`
- Wizard : `article-creation-wizard.tsx` (profil | actu | inspiration)
- Persona : `persona-reveal.tsx`, sync feedback articles
- Stratégie LinkedIn : `creation-strategy`, Perplexity
- Nav / home : `resolveHomeHrefFromProgress`, landing `/fr`

### 14.3 Skill interne Cursor

`~/.cursor/skills/jerry-ai-saas-expert/` — invoquer `@jerry-ai-saas-expert` pour revues pricing / packaging futures.

### 14.4 Liens docs existants

- `docs/ux-roadmap-sprints.md` — UX onboarding & éditeur (S1–S4)
- `docs/ux-matrice-pilotage.md` — matrice epics UX

---

## 15. Validation document

| Rôle | Nom | Date | Statut |
|------|-----|------|--------|
| Fondateur | — | 2026-03 | Pricing validé · relecture stratégique §13 |
| Tech lead | — | — | À planifier |
| Design | — | — | À planifier |
| Marketing | — | — | Copy public §13.4 à produire |

---

*Document maintenu sous `docs/UCM-Premium.md`. Toute modification de quota ou prix doit mettre à jour les sections 3, 7, 9, 10 et 13.*
