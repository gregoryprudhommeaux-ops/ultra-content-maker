# Mr. ANTI-AI-SLOP · Catalogue complet des TELLS

**Version :** 2026-07-24  
**Scope :** LinkedIn / B2B · FR · EN · ES (MX ≠ ES)  
**Méta-but :** pas « indétectable IA » — un texte qui semble écrit par une **personne identifiable**. Uniformément poli = encore du slop.  
**Règle UCM :** ces patterns sont **interdits** en génération / revise / Quality Panel (hard ban ou blocking flag). Ne jamais inventer faits, citations, clients, métriques pour « humaniser ».

---

## Comment lire ce doc

| Statut | Sens |
|--------|------|
| **HARD BAN** | Zéro occurrence · rewrite obligatoire |
| **BLOCKING** | Flag détecteur → pass humanizer forcé |
| **BAN** | Interdit en doctrine / prompt (détecté ou score) |
| **OK rare** | Autorisé avec garde-fous (ex. 1 question ouverte mid-body) |

---

# PARTIE 1 · Les 60 TELLS (liste plate)

## A. Accroches & ouverture

| # | ID | Tell (exemples) | Statut |
|---|-----|-----------------|--------|
| 1 | `in_todays_world` | *Dans un monde…* / *In today’s world…* / *En el mundo actual…* | BAN |
| 2 | `digital_era` | *À l’ère du numérique* / *In the digital era* / *En la era digital* | BAN |
| 3 | `school_opener` | *Pour commencer* / *First and foremost* / *Para empezar* / *Tout d’abord* / *Premièrement* (en **ouverture** ou connecteur scolaire de paragraphe) | BLOCKING |
| 4 | `excited_to_share` | *Je suis ravi de partager* / *Excited to share* / *Emocionado de compartir* | BAN |
| 5 | `heres_the_thing` | *Here’s the thing* / *Voici la chose* | BAN |
| 6 | `fr_corp_calque` | *Ce post traite de…* / *Assurez-vous de…* | BLOCKING |
| 7 | `sandwich_hook` | Choc + ligne vide + explication (hook sandwich) | BAN |
| 8 | `years_legitimation` | *J’ai passé X années à…* / *After X years in…* (surtout en ouverture) | HARD BAN |
| 9 | `fake_scoop` | *Personne ne parle de ça* / *Nobody talks about this* / *Nadie habla de esto* | HARD BAN |
| 56 | `self_title_hook` | *En tant que [titre pompeux]…* / *As a [serial entrepreneur / thought leader]…* / *Como [experto / founder]…* en accroche | **HARD BAN** |
| 58 | `thread_meta_promise` | *Ce thread va changer ta façon de voir…* / *This thread will change how you see…* / *Este hilo va a cambiar…* | **HARD BAN** |
| 59 | `hindsight_regret_hook` | *J’aurais aimé savoir ça avant* / *I wish I knew this earlier* / *Ojalá lo hubiera sabido antes* | BAN |

## B. Faux consensus (survey-hook)

| # | ID | Tell | Statut |
|---|-----|------|--------|
| 10 | `survey_opener` | *Je vois beaucoup de* / *I see a lot of* / *Veo a muchos* · *On me dit souvent* / *I often hear* | BLOCKING |
| 11 | `soft_survey_hear` | *La phrase que j’entends souvent* / *The phrase I often hear* / *La frase que escucho* | BLOCKING |
| 12 | `fake_category_quote` | Citation inventée attribuée à « les PME / les founders » sans source brief | HARD BAN |
| 13 | `theatrical_dig` | *En creusant* / *Quand je creuse* / *Digging a bit* / *Al indagar* | BLOCKING |
| 14 | `result_antithesis` | *Résultat : beaucoup… peu…* | BLOCKING |
| 15 | `less_more_packaging` | *Moins de X, plus de Y* / *Less X, more Y* / *Menos X, más Y* | BAN |
| 16 | `qualification_triad` | Framework / filtre en **3 critères symétriques** : *Même industrie, même fonction, même irritant* (bullets **ou** prose inline ×3 *même/same/mismo*) | BLOCKING |

## C. Emballages « smart »

| # | ID | Tell | Statut |
|---|-----|------|--------|
| 17 | `not_x_its_y` | *Ce n’est pas X, c’est Y* / *It’s not about X, it’s Y* / *No es solo X, es Y* / *Il ne s’agit pas de X, mais de Y* | **HARD BAN (0)** |
| 18 | `real_lever_close` | *Le vrai levier* / *The real lever* / *La verdadera palanca* / *La clé du succès* | BLOCKING |
| 19 | `soft_opinion_packaging` | *À mon sens, la réponse est…* / *In my view the key is…* | BAN |
| 20 | `soft_format_teaser` | *Je réfléchis à lancer un format* / *Thinking of launching…* (hors brief) | BLOCKING |
| 21 | `clean_framework_arc` | Thèse → préférence → communauté → teaser format → CTA · §§ égaux | BAN (polished residual) |
| 22 | `simple_yet_powerful` | *Simple mais puissant* / *Simple yet powerful* / *Simple pero poderoso* | HARD BAN |
| 23 | `false_humility` | *Je ne suis pas un expert, mais…* (+ contenu très prescriptif) | HARD BAN |

## D. Lexique loft / corp / hyperbole

| # | ID | Tell | Statut |
|---|-----|------|--------|
| 24 | `game_changer` | *Game changer* / *révolutionnaire* / *disruptif* / *game-changing* | BAN |
| 25 | `corporate_unlock` | *Unlock the full potential* / *Libérer le plein potentiel* / *Potenciar al máximo* | BAN |
| 26 | `leverage_utilize` | *Leverage* / *utilize* / *tirer parti* / *capitaliser sur* / *aprovechar al máximo* | BAN |
| 27 | `next_level_bait` | *Next level* / *Niveau supérieur* / *Siguiente nivel* / *Ready to transform…* | BLOCKING |
| 28 | `en_loft_vocab` | *testament, beacon, tapestry, pivotal, underscore, paramount, delve, our journey* | BLOCKING |
| 29 | `seamless_futureproof` | *Seamless* / *cutting-edge* / *future-proof* / *experiencia sin fricciones* | BAN |
| 30 | `mindset_synergy` | *Mindset* / *synergie* / *transformation digitale* (creux) | BAN |
| 31 | `the_secret` | *Le secret est…* / *The secret is…* | BAN |
| 32 | `delve` | *Let’s delve* / *Plongeons* / *Profundicemos* | BAN |

## E. Syntaxe & rythme

| # | ID | Tell | Statut |
|---|-----|------|--------|
| 33 | `em_dash_overuse` | Tirets cadratin (—) en série · max 1 / paragraphe | BAN (lint) |
| 34 | `triple_adjectives` | Triplet **lexical** rythmique : *Clair, direct, efficace* / *clear, direct, effective* (adj/noms empilés pour « sonner bien ») | BAN (lint) |
| 35 | `uniform_paragraph_size` | Tous les paragraphes de la même taille | BAN (lint) |
| 36 | `uniform_sentence_rhythm` | 4–5 phrases de longueur quasi identique | BAN (lint) |
| 37 | `emoji_line_start` | Même emoji en tête de chaque puce / trop de lignes | BAN (lint) |
| 38 | `bold_lead_every_bullet` | **Gras lead :** sur chaque ligne de liste | BAN |
| 39 | `anaphora_stack` | 3+ lignes d’affilée qui démarrent par *Quand… / Si… / When… / If… / Cuando…* | HARD BAN |
| 40 | `two_sentence_blocks` | Chaque paragraphe = exactement 2 phrases | BAN (lint) |
| 57 | `uniform_list_length` | Liste de **5+** bullets/items **tous de longueur quasi égale** (effet tableau Excel) | BAN (lint) |
| 60 | `decorative_emoji_suffix` | Emojis décoratifs en **fin** de titre ou bullet (*…🔥* / *…🚀* / *…💡*) — pas informatifs | BLOCKING |

## F. Transitions & structure

| # | ID | Tell | Statut |
|---|-----|------|--------|
| 41 | `mechanical_transitions` | *Par ailleurs / Moreover / Además* en tête en série | BAN |
| 42 | `numbered_moral_list` | **Arc** « 3 lessons » / leçons numérotées / intro→anecdote→bullets→morale→Q (structure de post entière) | BAN |
| 43 | `geo_sector_filler` | Opener **structurel** interchangeable (swap Mexique↔autre marché / SaaS↔autre secteur = même texte) · pas un lexique | **BAN** · détection = heuristique (voir ci-dessous) |
| 44 | `soft_verb_stack` | *Permettre / favoriser / contribuer / enable / foster / facilitar* empilés | BLOCKING |

## G. Closes & engagement

| # | ID | Tell | Statut |
|---|-----|------|--------|
| 45 | `at_end_of_day` | *Au final* / *At the end of the day* / *Al final del día* | BAN |
| 46 | `wikipedia_moral_close` | *Tout est question d’exécution* / *It’s all about…* | BLOCKING |
| 47 | `engagement_bait` | *Agree?* / *Like if* / *Commente et ajoute-moi* / *Déjame un comentario* | BLOCKING |
| 48 | `closed_rhetorical_cta` | *Tu veux vraiment laisser passer ça ?* / *Are you really going to let this pass?* | HARD BAN |
| 49 | `follower_proof_bait` | *Ceux qui me suivent peuvent témoigner* / *Those who follow me can vouch* | BLOCKING |
| 50 | `network_moral_close` | *Un bon réseau ne se mesure pas…* / *A good network isn’t measured…* | BLOCKING |
| 51 | `wip_soft_spine` | *Je perfectionne un format* / *What I really care about is…* / *Estoy perfeccionando* | BLOCKING |
| 52 | `vague_coming_soon_cta` | *Je prépare quelque chose. Reste à l’écoute.* / *Something is coming…* | HARD BAN |
| 53 | `round_follower_milestone` | *1 000 abonnés. Ce que j’ai appris.* / *1,000 followers. What I learned.* | HARD BAN |
| 54 | `fake_we_intimacy` | *On a tous vécu ce moment où…* / *We’ve all been there…* | HARD BAN |
| 55 | `funnel_dump_teaser` | Dump funnel complet dans un teaser : waitlist→profil→invitation→siège/paiement (FR/EN/ES) | BLOCKING |

> Compteur : **60 IDs** (+5 · 2026-07-24 g : `self_title_hook`, `uniform_list_length`, `thread_meta_promise`, `hindsight_regret_hook`, `decorative_emoji_suffix`). Certains chevauchent volontairement (familles).

### Doublons fonctionnels nommés (ne pas fusionner)

| Paire | Niveau A | Niveau B | Relation | Règle de lecture |
|-------|----------|----------|----------|------------------|
| `#3` `school_opener` ↔ `#42` `numbered_moral_list` | **Connecteur** scolaire local (*Premièrement,* / *First and foremost,* en tête de § ou d’intro) | **Architecture** du post (liste morale numérotée / « 3 lessons » / arc complet) | Chevauchement sur le signal « numérotation » | Flaguer **les deux** si présents. `#3` seul = ouverture/transition scolaire. `#42` seul = squelette pédagogique. *Premièrement* dans une liste 1-2-3 de leçons → compter surtout `#42` ; *Premièrement* hors liste morale → `#3`. |
| `#16` `qualification_triad` ↔ `#34` `triple_adjectives` | **Structure / fond** : 3 critères de qualification symétriques (*même X, même Y, même Z* ou 3 bullets « same… ») | **Lexique / surface** : 3 adjectifs/noms rythmiques (*clair, direct, efficace*) | Même famille « triplets IA », **deux étages** | L’un **n’absorbe pas** l’autre. Un post peut avoir `#34` sans `#16` (style) ou `#16` sans `#34` (framework). Les deux = double signal → rewrite prioritaire. |
| `#37` `emoji_line_start` ↔ `#60` `decorative_emoji_suffix` | Emoji en **tête** de ligne / puce | Emoji décoratif en **fin** de titre ou bullet (*🔥🚀💡*) | Même famille « emoji UI », deux positions | Flaguer selon la position ; les deux = template décoratif fort. |
| `#35` `uniform_paragraph_size` ↔ `#57` `uniform_list_length` | §§ de même taille | Items de liste (5+) de même longueur | Même famille « grille régulière » | Flaguer le niveau présent (prose vs liste). |

### Détection programmatique · `#43` `geo_sector_filler`

Seul tell **structurel de contenu** (ni lexique, ni rythme) : une regex « mot interdit » ne suffit pas.

| Étape | Règle | Implémentation (`slop-detector.ts` → `detectGeoSectorFiller`) |
|-------|--------|----------------------------------------------------------------|
| 0 | **Oracle humain** | Remplacer chaque toponyme / label secteur de l’opener par un autre ; si la claim tient sans réécriture → flag. |
| 1 | **Fenêtre** | Opener = 2 premiers paragraphes **ou** ~320 premiers caractères (le plus court des deux bornes utiles). |
| 2 | **Slot geo/secteur** | La fenêtre contient ≥1 token d’une liste geo (Mexique, Mexico, México, LatAm, Amérique latine, Guadalajara, France, Europe, …) **ou** secteur-slot (*SaaS, fintech, tech, retail…*) en tête de claim. |
| 3 | **Frame template** | ET match d’au moins un **cadre interchangeable** : *Au/En/In GEO, aujourd’hui/le marché/les entreprises…* · *GEO est une opportunité / booming* · *comme ailleurs / as elsewhere / como en cualquier* · *doing business in GEO* · *Dans la tech/SaaS aujourd’hui…* |
| 4 | **Ancre anti-faux-positif** | **Ne pas** flaguer si la même fenêtre contient une **ancre non-swappable** : chiffre / `%` / `$`/`€` · délai (*avant / d’ici / deadline*) · friction nommée concrète (citation courte, outil, process) · nom propre d’org/produit hors liste geo générique. |
| 5 | **Poids** | `weight: 2` · id `geo_sector_filler` · BAN (score) + blocking humanizer gate. |

**Rewrite :** garder le marché si le brief l’exige, mais coller un enjeu non compressible (contrainte, critère, chiffre, rôle, refus) — le geo devient contexte, plus le sujet interchangeable.

---

# PARTIE 2 · Packs structuraux (plusieurs tells liés)

## Survey-hook arc (HARD / SOFT)

1. Ouverture consensus (*je vois / j’entends*)  
2. Citation inventée de catégorie  
3. Dig théâtral (*en creusant*)  
4. Triade *même×3* ou *beaucoup / peu*  
5. Close *vrai levier*  

**Rewrite :** thèse-first → **un** critère asymétrique → conséquence → close sans packaging.

## Polished residual (après purge du survey-hook)

1. Triade inline *même/same/mismo ×3*  
2. Arc clean thèse→préférence→communauté→teaser format→CTA  
3. Lexique sobre + hedge mais **zéro aspérité**  

## Job taxonomy (lié aux tells — pas un brief orphelin)

**Règle :** déclarer **un** Job avant ANALYZE / HUMANIZE / génération. Les 60 tells restent tous interdits ; la colonne *Tells prioritaires* = scan **d’abord** pour ce job (hit = blocking immédiat). Les packs ci-dessous détaillent le *pourquoi*.

| Job | Longueur | Produit | CTA | Tells interdits prioritaires |
|-----|----------|---------|-----|------------------------------|
| **TEASER** | ~120–150 mots | ≤1 phrase | DM ou lien | `#55` `funnel_dump_teaser` · `#49` `follower_proof_bait` · `#47` `engagement_bait` · `#50` `network_moral_close` · `#51` `wip_soft_spine` · `#52` `vague_coming_soon_cta` · `#20` `soft_format_teaser` · `#42` `numbered_moral_list` |
| **EXPLAIN** | plus long OK | funnel OK | soft | `#10`–`#16` survey-hook pack · `#21` `clean_framework_arc` · `#42` `numbered_moral_list` · `#8` `years_legitimation` · `#9` `fake_scoop` · `#17` `not_x_its_y` · `#18` `real_lever_close` · `#46` `wikipedia_moral_close` |
| **CONVERT** | court | seat/invite clair | DM / lien · jamais comment-bait | `#47` `engagement_bait` · `#48` `closed_rhetorical_cta` · `#49` `follower_proof_bait` · `#52` `vague_coming_soon_cta` · `#50` `network_moral_close` · `#18` `real_lever_close` · `#22` `simple_yet_powerful` · `#55` (si le post se dilue en tutoriel funnel) |

## Teaser failure pack (job TEASER · map 1:1)

| # pack | ID | Tell |
|--------|-----|------|
| 1 | `#55` `funnel_dump_teaser` | waitlist→profil→invitation→siège |
| 2 | `#49` `follower_proof_bait` | *Ceux qui me suivent peuvent témoigner* |
| 3 | `#47` `engagement_bait` | *Commente et ajoute-moi* / *Like if* |
| 4 | `#50` `network_moral_close` | *Un bon réseau ne se mesure pas…* |
| 5 | `#51` `wip_soft_spine` | *Je perfectionne / Estoy perfeccionando* |

---

# PARTIE 3 · Autres bans (hors liste numérotée)

## Scènes fake
- *Ce matin / Dimanche soir / Un client m’a appelé en panique*  
- *Yesterday a CEO DM’d me…* (sauf si dans le brief)

## Métaphore networking obsolète
- *Cartes de visite / business cards / tarjetas de visita* comme foil  
→ préférer : cocktails pitch, LinkedIn connects, intros faibles, « todos se venden »

## Fake-luxury / community loft (produit + members)
- *Exclusif / curated / selecta / alto valor / high-signal / dîners qualifiés / red privada seleccionados / we’d love your feedback*  
→ concret : mesa chica, un thème, fit, `LA MESA · Guadalajara`

## Filtre ES régional · MX ≠ ES (bloc dédié — audience Guadalajara)

**Pourquoi ça compte :** pour LA MESA / LinkedIn MX, un post en *castellano d’Espagne* ou en *« español neutro »* IA se lit faux immédiatement. Ce n’est pas un détail lexique : c’est un tell de localisation ratée. **Déclarer la cible** (MX par défaut si Guadalajara / LatAm ; ES-Spain seulement si le brief le dit). Ne jamais mixer.

### Registre cible (MX B2B)

| À viser | À éviter |
|---------|----------|
| Espagnol **mexicain pro-chaleureux** : *tú*, direct, concret, *computadora / platicar / coordinar* quand ça colle | Castillan d’Espagne collé tel quel (*vosotros, vale, venga, ordenador*) |
| Vocabulaire métier clair, aspérités de personne | *Español neutro* IA : *tú* + formalité distante + gérondifs calqués de l’anglais (*siendo publicado hoy…*) |
| Slang **hors** LinkedIn B2B sauf voix Persona explicite | Coller du street MX (*güey*, *órale* en masse) **ou** du colloquial ES (*tío*, *mola*) pour « sonner local » — les deux cassent le registre B2B |

**Rappel :** *güey* ≠ *tío* n’est pas « choisir le slang MX » — c’est « ne pas importer le colloquial d’un autre pays ». Sur LinkedIn pro GDL, le défaut = registre LATAM B2B, pas street, pas Madrileño.

### Lexique concret (Spain tell → MX)

| Ban si cible MX | Préférer (MX) | Note |
|-----------------|---------------|------|
| *vosotros / os* | *ustedes / los* (ou *tú* selon Persona) | Morphologie ES-Spain |
| *vale / venga* | *ok / de acuerdo / vamos* (selon ton) | Particules ES très marquées |
| *ordenador* | *computadora* | Lexème ES vs MX |
| *móvil* (si calque ES fort) | *celular* | Pref MX courant |
| *agendar una llamada* | *coordinar una reunión / una llamada* | Anglicisme partagé — ban des deux côtés |
| *remover* (sens delete) | *eliminar / quitar* | Calque EN — ban partagé |
| *coger* (sens prendre) | *tomar / agarrar* (selon contexte) | Sens MX ≠ ES — risque quiproquo |

### Détection runtime (UCM)

| ID | Signal | Quand |
|----|--------|--------|
| `es_spain_in_mx_tell` | *vosotros / vale / ordenador* | Contenu `es` orienté MX |
| `es_agendar` | *agendar una llamada/reunión* | Tout ES |

### Si cible = Espagne (brief only)

Registre local direct · **ne pas** coller fillers MX-only · pas de faux neutre · gérondifs EN interdits. Les bans *agendar / remover* restent.

## Question rhétorique — 2 seaux (pas de doublon)

| Seau | Exemple | Statut |
|------|---------|--------|
| **Rythme** (mid-body) | *Et si le frein n’était pas le prix ?* | OK rare (≤1), si ça avance la pensée |
| **Pression CTA** (close) | *Tu veux vraiment laisser passer ça ?* | HARD BAN (`closed_rhetorical_cta`) |

## Closes soft OK
- *Si vous êtes dans cette situation, dites-moi ce que vous avez essayé.*  
- *If you’re in that spot, tell me what you’ve already tried.*  
- *Si estás en esa situación, cuéntame qué ya intentaste.*

## Closes ouvertes OK
- *C’est comme ça que je le vois aujourd’hui.*  
- *That’s how I see it right now.*  
- *Así lo veo hoy.*

---

# PARTIE 4 · Comportements (pas des phrases, mais des tells)

**Mini-grille (rewrite prioritaire) :**

| À éviter | À faire |
|----------|---------|
| Verbes mous (*permettre, favoriser, contribuer, enable, foster*) | Verbe d’action net (*envoie, coupe, livre, bloque, casse*) |
| Densité plate (1 idée / ligne, toujours) | Alternance court / dense / respiration |
| Close engagement bait (*Agree?* / *Like if* / pression CTA) | Close ouverte sans pression (*Si tu es dans ce cas, dis-moi ce que tu as essayé.*) |

Codes L–S (détail) :

| Code | Comportement | Action |
|------|--------------|--------|
| L | Verbes mous empilés | → verbes nets (*bloque, casse, pousse, envoie, coupe, livre*) |
| M | Diction académique | → mot courant (*voir* > *observer*) |
| N | Densité uniforme (1 idée / ligne) | → densités inégales (court / dense / respiration) |
| O | Transitions plates (*Ensuite / En pratique / Enfin*) | → beats de réaction |
| P | Certitude Wikipedia | → hedges naturels |
| Q | Raisons symétriques 3×2 phrases | → profondeurs inégales |
| R | Ponctuation métronome | → cadence variée |
| S | Close morale **ou** engagement bait | → close ouverte / expérience · zéro pression (`engagement_bait` / `closed_rhetorical_cta`) |

**Anti-sur-correction :** garder des phrases longues fluides — le style « punchline only » est un nouveau tell.

---

# PARTIE 5 · Checklist pre-delivery

- [ ] Zéro `not_x_its_y`  
- [ ] Zéro survey-hook hard/soft + dig + triade même×3  
- [ ] Zéro years / scoop / on a tous / milestone / simple puissant / anaphore×3 / coming soon / fausse humilité / self-title / thread meta-promise  
- [ ] Zéro CTA rhétorique fermé / engagement bait / follower-proof  
- [ ] Em dash ≤ 1 / paragraphe  
- [ ] Pas de triplets adjectifs · pas de liste Excel (5+ items longueur égale) · pas d’emoji décoratif en suffixe  
- [ ] Densité & §§ irréguliers  
- [ ] 1–2 marqueurs de voix préservés  
- [ ] Hedges si la claim n’est pas absolue  
- [ ] ±15 % longueur sur rewrite  
- [ ] Job déclaré (TEASER / EXPLAIN / CONVERT) + scan *Tells prioritaires* de ce job (Partie 2)  
- [ ] Pas de *j’aurais aimé savoir ça avant* / hindsight regret hook  

- [ ] Rien inventé  
- [ ] Test : *ce post passerait dans un feed saturé d’IA ?* → si oui, rewrite  

---

# PARTIE 6 · Miroirs UCM

| Concern | Fichier |
|---------|---------|
| Bans génération | `src/lib/prompts/anti-linkedin-slop.ts` |
| Humanizer | `src/lib/prompts/anti-ai-humanizer.ts` |
| Rules compactes | `src/lib/articles/human-writing/human-writing-rules.ts` |
| Lexique | `src/lib/articles/human-writing/banned-phrases.ts` |
| Detector | `src/lib/articles/slop-detector.ts` |
| Lint | `src/lib/articles/human-writing/human-writing-lint.ts` |
| Gate post-gen | `src/lib/articles/humanize-article-pass.ts` |
| Skill | `~/.cursor/skills/anti-linkedin-slop/` (+ copies projet) |

**Source de vérité skill :** `reference.md` · `PROMPT.md` · `examples.md` · `changelog.md`

---

*Fin du catalogue · Mr. ANTI-AI-SLOP · 2026-07-24*
