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

# PARTIE 1 · Les 49 TELLS (liste plate)

## A. Accroches & ouverture

| # | ID | Tell (exemples) | Statut |
|---|-----|-----------------|--------|
| 1 | `in_todays_world` | *Dans un monde…* / *In today’s world…* / *En el mundo actual…* | BAN |
| 2 | `digital_era` | *À l’ère du numérique* / *In the digital era* / *En la era digital* | BAN |
| 3 | `school_opener` | *Pour commencer* / *First and foremost* / *Para empezar* / *Tout d’abord* / *Premièrement* | BLOCKING |
| 4 | `excited_to_share` | *Je suis ravi de partager* / *Excited to share* / *Emocionado de compartir* | BAN |
| 5 | `heres_the_thing` | *Here’s the thing* / *Voici la chose* | BAN |
| 6 | `fr_corp_calque` | *Ce post traite de…* / *Assurez-vous de…* | BLOCKING |
| 7 | `sandwich_hook` | Choc + ligne vide + explication (hook sandwich) | BAN |
| 8 | `years_legitimation` | *J’ai passé X années à…* / *After X years in…* (surtout en ouverture) | HARD BAN |
| 9 | `fake_scoop` | *Personne ne parle de ça* / *Nobody talks about this* / *Nadie habla de esto* | HARD BAN |

## B. Faux consensus (survey-hook)

| # | ID | Tell | Statut |
|---|-----|------|--------|
| 10 | `survey_opener` | *Je vois beaucoup de* / *I see a lot of* / *Veo a muchos* · *On me dit souvent* / *I often hear* | BLOCKING |
| 11 | `soft_survey_hear` | *La phrase que j’entends souvent* / *The phrase I often hear* / *La frase que escucho* | BLOCKING |
| 12 | `fake_category_quote` | Citation inventée attribuée à « les PME / les founders » sans source brief | HARD BAN |
| 13 | `theatrical_dig` | *En creusant* / *Quand je creuse* / *Digging a bit* / *Al indagar* | BLOCKING |
| 14 | `result_antithesis` | *Résultat : beaucoup… peu…* | BLOCKING |
| 15 | `less_more_packaging` | *Moins de X, plus de Y* / *Less X, more Y* / *Menos X, más Y* | BAN |
| 16 | `qualification_triad` | *Même industrie, même fonction, même irritant* (bullets **ou** prose inline ×3) | BLOCKING |

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
| 34 | `triple_adjectives` | *Clair, direct, efficace* / *clear, direct, effective* | BAN (lint) |
| 35 | `uniform_paragraph_size` | Tous les paragraphes de la même taille | BAN (lint) |
| 36 | `uniform_sentence_rhythm` | 4–5 phrases de longueur quasi identique | BAN (lint) |
| 37 | `emoji_line_start` | Même emoji en tête de chaque puce / trop de lignes | BAN (lint) |
| 38 | `bold_lead_every_bullet` | **Gras lead :** sur chaque ligne de liste | BAN |
| 39 | `anaphora_stack` | 3+ lignes d’affilée qui démarrent par *Quand… / Si… / When… / If… / Cuando…* | HARD BAN |
| 40 | `two_sentence_blocks` | Chaque paragraphe = exactement 2 phrases | BAN (lint) |

## F. Transitions & structure

| # | ID | Tell | Statut |
|---|-----|------|--------|
| 41 | `mechanical_transitions` | *Par ailleurs / Moreover / Además* en tête en série | BAN |
| 42 | `numbered_moral_list` | *3 lessons* / leçons numérotées / arc intro→anecdote→bullets→morale→Q | BAN |
| 43 | `geo_sector_filler` | Opener interchangeable (swap Mexique↔autre marché = même texte) | BAN |
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

> Compteur : **54 IDs** (les « 40 classiques » + survey-hook pack + teaser pack + 9 tells 2026-07-24 + lint syntaxe). Certains chevauchent volontairement (familles).

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

## Teaser failure pack (job TEASER)

1. Funnel dump waitlist→profil→invitation→siège  
2. Follower-proof bait  
3. CTA comment/add  
4. Network moral close  
5. WIP soft spine  

| Job | Longueur | Produit | CTA |
|-----|----------|---------|-----|
| TEASER | ~120–150 mots | ≤1 phrase | DM ou lien |
| EXPLAIN | plus long OK | funnel OK | soft |
| CONVERT | court | seat/invite clair | DM / lien · jamais comment-bait |

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

## Filtre ES régional
- **MX :** ban *vosotros / vale / ordenador* · préférer *computadora / platicar / coordinar*  
- Ban *agendar una llamada* → *coordinar una reunión*  
- Ban *remover* (delete) → *eliminar / quitar*

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

| Code | Comportement | Action |
|------|--------------|--------|
| L | Verbes mous empilés | → verbes nets (*bloque, casse, pousse*) |
| M | Diction académique | → mot courant (*voir* > *observer*) |
| N | Densité uniforme (1 idée / ligne) | → densités inégales |
| O | Transitions plates (*Ensuite / En pratique / Enfin*) | → beats de réaction |
| P | Certitude Wikipedia | → hedges naturels |
| Q | Raisons symétriques 3×2 phrases | → profondeurs inégales |
| R | Ponctuation métronome | → cadence variée |
| S | Close morale | → close ouverte / expérience |

**Anti-sur-correction :** garder des phrases longues fluides — le style « punchline only » est un nouveau tell.

---

# PARTIE 5 · Checklist pre-delivery

- [ ] Zéro `not_x_its_y`  
- [ ] Zéro survey-hook hard/soft + dig + triade même×3  
- [ ] Zéro years / scoop / on a tous / milestone / simple puissant / anaphore×3 / coming soon / fausse humilité  
- [ ] Zéro CTA rhétorique fermé / engagement bait / follower-proof  
- [ ] Em dash ≤ 1 / paragraphe  
- [ ] Pas de triplets adjectifs  
- [ ] Densité & §§ irréguliers  
- [ ] 1–2 marqueurs de voix préservés  
- [ ] Hedges si la claim n’est pas absolue  
- [ ] ±15 % longueur sur rewrite  
- [ ] Job déclaré (TEASER / EXPLAIN / CONVERT)  
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
