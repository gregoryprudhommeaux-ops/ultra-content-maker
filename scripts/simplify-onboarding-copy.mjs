#!/usr/bin/env node
/**
 * One-shot copy refresh: simpler onboarding + landing (FR / EN / ES).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["fr", "en", "es"];

const patches = {
  fr: {
    landing: {
      howItWorks: {
        title: "Comment ça marche",
        subtitle: "Quatre étapes simples. Vous affinez au fil du temps.",
        steps: {
          profile: {
            title: "Votre profil",
            description: "Quelques liens et une ligne sur vous. Le strict minimum pour démarrer.",
          },
          persona: {
            title: "Votre Persona",
            description: "L'IA résume qui vous êtes. Vous validez en un coup d'œil · modifiable à tout moment.",
          },
          brief: {
            title: "Un brief court",
            description: "Dites ce que vous voulez dire. L'agent s'occupe du reste.",
          },
          generate: {
            title: "Générer et choisir",
            description: "Plusieurs propositions. Vous gardez celle qui vous convient.",
          },
        },
      },
      capabilities: {
        title: "L'essentiel pour publier sur LinkedIn",
        subtitle: "Commencez vite. Approfondissez quand vous voulez.",
        persona: {
          title: "Persona qui apprend",
          description: "Un résumé de votre voix. Il s'améliore à chaque retour que vous lui donnez.",
        },
        brief: {
          title: "Brief simple",
          description: "Une intention claire · pas besoin de tout détailler dès le départ.",
        },
        exploration: {
          title: "Plusieurs angles",
          description: "Large et niche dans le même lot · vous choisissez ce qui vous ressemble.",
        },
        quality: {
          title: "Qualité LinkedIn",
          description: "Scores et suggestions pour éviter le contenu générique.",
        },
        distribution: {
          title: "Formats et actus",
          description: "Carrousel, vidéo, commentaire · et sujets d'actualité quand vous en avez besoin.",
        },
        measurement: {
          title: "Amélioration continue",
          description: "Après publication, l'agent intègre ce qui a bien marché.",
        },
      },
    },
    setup: {
      steps: { llm: "Connexion IA" },
      onboarding: {
        progressLabel: "Parcours : {percent} %",
        status: { locked: "Étape suivante bientôt disponible" },
        welcome: {
          title: "Votre premier post, en quelques minutes",
          subtitle:
            "On commence simple. Rien n'est figé : vous pourrez tout compléter et affiner plus tard.",
          pillars: [
            "Le minimum pour démarrer · pas besoin d'être parfait dès le début.",
            "Chaque étape est modifiable à tout moment.",
            "Plus vous utilisez l'outil, plus il vous ressemble.",
          ],
          resumeHint: "Vous avez déjà commencé ({percent} %). Reprenez quand vous voulez.",
          ctaStart: "Commencer",
          ctaResume: "Reprendre",
          ctaReady: "Créer un post",
        },
        hub: {
          completedEmpty: "Rien de fait pour l'instant · commencez par votre profil.",
          steps: {
            setupLlm: {
              title: "Connexion IA",
              description:
                "Essai : l'IA est incluse. Pro : ajoutez votre clé quand vous voulez.",
            },
            authorEssential: {
              title: "Votre profil",
              description:
                "LinkedIn + une ligne sur vous. Le reste peut attendre.",
            },
            audience: {
              title: "Votre cible (optionnel)",
              description: "Utile mais pas obligatoire · passez si vous préférez tester tout de suite.",
            },
            persona: {
              title: "Votre Persona",
              description:
                "Relisez le résumé de l'IA. Validez pour continuer · vous pourrez le modifier ensuite.",
            },
            startReady: {
              title: "Premier post",
              description: "Tout est prêt pour essayer.",
            },
          },
        },
        ready: {
          title: "C'est parti",
          subtitle:
            "Vous pouvez créer maintenant. Votre profil et votre Persona continueront de s'affiner au fil de l'usage.",
          check: {
            apiKey: "IA connectée",
            profile: "Profil de base",
            audience: "Cible (ou passée)",
            persona: "Persona validé",
          },
          ctaCreate: "Créer mon premier post",
          ctaReviewPersona: "Revoir mon Persona",
        },
        wizard: {
          stepLabel: "Étape {current} sur {total}",
          backToWelcome: "Vue d'ensemble",
        },
        banner: {
          persona: {
            title: "Une dernière étape avant de créer",
            description:
              "Relisez vite fait ce que l'IA a compris de vous. Vous pourrez tout modifier ensuite.",
          },
          llm: {
            title: "Connectez l'IA",
            description:
              "Essai : c'est déjà inclus. Sinon, ajoutez votre clé · vous pourrez le faire plus tard depuis les réglages.",
          },
          author: {
            title: "Quelques infos sur vous",
            description:
              "LinkedIn et une ligne de positionnement suffisent pour commencer. Le reste est optionnel.",
          },
          audience: {
            title: "Votre cible (facultatif)",
            description: "Ça aide, mais vous pouvez passer et revenir plus tard.",
          },
          generic: {
            title: "Presque prêt",
            description: "Encore une petite étape, puis vous pourrez tester.",
          },
          cta: "Continuer · {step}",
        },
        guard: {
          checking: "Un instant…",
          redirecting: "On vous guide vers la prochaine étape…",
        },
      },
      llm: {
        title: "Connexion IA",
        subtitle:
          "Essai gratuit : l'IA est déjà active, passez à l'étape suivante. Pro : connectez votre clé (ChatGPT, Claude, Gemini ou Perplexity) · modifiable à tout moment.",
        trialIncluded: {
          title: "IA incluse dans votre essai",
          body: "Pas besoin de clé pour commencer. Vous pourrez en ajouter une plus tard si vous passez en Pro.",
          cta: "Continuer vers Mon profil →",
        },
        continue: "Continuer vers Mon profil →",
      },
      author: {
        subtitle:
          "LinkedIn + rôle + positionnement : le minimum pour démarrer. Tout le reste est optionnel et modifiable plus tard.",
        tabs: {
          hint: {
            essential: "LinkedIn et une ligne sur vous · le strict minimum.",
            voice: "Affinez votre voix quand vous avez le temps.",
            inspirations: "À ajouter plus tard pour enrichir le Persona.",
          },
          requiredNote: {
            essential:
              "LinkedIn est le seul champ vraiment nécessaire pour avancer. Site et blog : quand vous voulez.",
            voice:
              "Rôle, positionnement et langue aident beaucoup · vos posts de référence peuvent attendre.",
            inspirations:
              "Tout est optionnel ici. Ajoutez des inspirations quand vous voulez approfondir.",
          },
        },
        continue: "Continuer",
      },
      audience: {
        title: "Pour qui vous écrivez",
        subtitle: "Optionnel · une esquisse suffit. Vous pourrez préciser plus tard.",
        stepBadge: "Facultatif",
        skip: "Passer pour l'instant",
        skipHint: "L'IA devinera votre lecteur depuis votre profil. Vous pourrez revenir ici quand vous voulez.",
      },
      persona: {
        title: "Votre Persona",
        subtitle:
          "Ce que l'IA a compris de vous. Relisez, ajustez si besoin, validez · tout reste modifiable ensuite.",
        reveal: {
          eyebrow: "Résumé IA",
          title: "Voici ce que l'IA retient de vous",
          subtitle:
            "Un coup d'œil suffit pour commencer. Vous affinerez au fil des posts.",
          validatedEyebrow: "Persona actif",
          validatedTitle: "Persona validé",
          validatedSubtitle: "Vous pouvez créer ou continuer à l'affiner quand vous voulez.",
          editHint: "Cliquez pour ajuster · les changements mettent à jour le Persona.",
          promptHint: "Détail technique · modifiable à tout moment.",
          goCreate: "Créer mon premier post →",
        },
        help: {
          guideTitle: "À quoi sert le Persona ?",
          guideHint: "Votre boussole éditoriale · elle s'enrichit avec l'usage.",
          promptBody:
            "Texte lu par l'IA à chaque génération. Pas besoin de tout maîtriser maintenant · éditable à tout moment.",
          sections: {
            contentBrain: {
              title: "Votre voix",
              body: "Positionnement, ton et sujets. Plus vous l'utilisez, plus c'est précis.",
            },
            topicDna: {
              title: "Vos thèmes",
              body: "Les sujets que vous abordez (et ceux à éviter). À affiner progressivement.",
            },
            operatingRules: {
              title: "Style LinkedIn",
              body: "Format et crédibilité. L'agent applique ces règles à chaque post.",
            },
            learned: {
              title: "Ce que l'agent apprend",
              body: "Vos retours sur les posts enrichissent le Persona sans effacer votre base.",
            },
            validate: {
              title: "Valider pour créer",
              body: "Une validation rapide débloque la création. Vous pourrez tout modifier ensuite.",
            },
          },
        },
      },
    },
    settings: {
      llmKeyDialog: {
        title: "Connexion IA",
        body: "Essai : l'IA est incluse. Pro : ajoutez votre clé pour générer Persona et posts.",
        dismiss: "Plus tard",
      },
    },
  },
  en: {
    landing: {
      howItWorks: {
        title: "How it works",
        subtitle: "Four simple steps. Refine as you go.",
        steps: {
          profile: {
            title: "Your profile",
            description: "A few links and one line about you. The minimum to get started.",
          },
          persona: {
            title: "Your Persona",
            description: "The AI summarizes who you are. Quick review · editable anytime.",
          },
          brief: {
            title: "A short brief",
            description: "Say what you want to say. The agent handles the rest.",
          },
          generate: {
            title: "Generate and choose",
            description: "Several options. Keep the one that fits.",
          },
        },
      },
      capabilities: {
        title: "What you need to publish on LinkedIn",
        subtitle: "Start fast. Go deeper when you want.",
        persona: {
          title: "Persona that learns",
          description: "A summary of your voice. It improves with every piece of feedback you give.",
        },
        brief: {
          title: "Simple brief",
          description: "Clear intent · no need to nail every detail on day one.",
        },
        exploration: {
          title: "Multiple angles",
          description: "Broad and niche in one batch · you pick what sounds like you.",
        },
        quality: {
          title: "LinkedIn quality",
          description: "Scores and suggestions to avoid generic content.",
        },
        distribution: {
          title: "Formats and news",
          description: "Carousel, video, first comment · plus news topics when you need them.",
        },
        measurement: {
          title: "Continuous improvement",
          description: "After publishing, the agent learns what worked.",
        },
      },
    },
    setup: {
      steps: { llm: "AI connection" },
      onboarding: {
        progressLabel: "Journey: {percent}%",
        status: { locked: "Next step coming up" },
        welcome: {
          title: "Your first post in minutes",
          subtitle:
            "We start simple. Nothing is set in stone · you can complete and refine everything later.",
          pillars: [
            "The minimum to get started · no need to be perfect on day one.",
            "Every step can be changed anytime.",
            "The more you use it, the more it sounds like you.",
          ],
          resumeHint: "You already started ({percent}%). Pick up whenever you like.",
          ctaStart: "Get started",
          ctaResume: "Resume",
          ctaReady: "Create a post",
        },
        hub: {
          completedEmpty: "Nothing done yet · start with your profile.",
          steps: {
            setupLlm: {
              title: "AI connection",
              description: "Trial: AI included. Pro: add your key whenever you want.",
            },
            authorEssential: {
              title: "Your profile",
              description: "LinkedIn + one line about you. The rest can wait.",
            },
            audience: {
              title: "Your audience (optional)",
              description: "Helpful but not required · skip if you want to test right away.",
            },
            persona: {
              title: "Your Persona",
              description:
                "Review the AI summary. Validate to continue · you can edit it later.",
            },
            startReady: {
              title: "First post",
              description: "You're ready to try.",
            },
          },
        },
        ready: {
          title: "You're set",
          subtitle:
            "You can create now. Your profile and Persona will keep improving as you use the tool.",
          check: {
            apiKey: "AI connected",
            profile: "Basic profile",
            audience: "Audience (or skipped)",
            persona: "Persona validated",
          },
          ctaCreate: "Create my first post",
          ctaReviewPersona: "Review my Persona",
        },
        wizard: {
          stepLabel: "Step {current} of {total}",
          backToWelcome: "Overview",
        },
        banner: {
          persona: {
            title: "One last step before creating",
            description:
              "Quickly review what the AI understood about you. You can change everything later.",
          },
          llm: {
            title: "Connect AI",
            description:
              "Trial: already included. Otherwise add your key · you can do this later in settings.",
          },
          author: {
            title: "A few details about you",
            description:
              "LinkedIn and one positioning line are enough to start. Everything else is optional.",
          },
          audience: {
            title: "Your audience (optional)",
            description: "It helps, but you can skip and come back later.",
          },
          generic: {
            title: "Almost there",
            description: "One small step, then you can try it out.",
          },
          cta: "Continue · {step}",
        },
        guard: {
          checking: "One moment…",
          redirecting: "Taking you to the next step…",
        },
      },
      llm: {
        title: "AI connection",
        subtitle:
          "Free trial: AI is already active, go to the next step. Pro: connect your key (ChatGPT, Claude, Gemini, or Perplexity) · change anytime.",
        trialIncluded: {
          title: "AI included in your trial",
          body: "No key needed to start. You can add one later if you upgrade to Pro.",
          cta: "Continue to My profile →",
        },
        continue: "Continue to My profile →",
      },
      author: {
        subtitle:
          "LinkedIn + role + positioning: the minimum to start. Everything else is optional and editable later.",
        tabs: {
          hint: {
            essential: "LinkedIn and one line about you · the bare minimum.",
            voice: "Refine your voice when you have time.",
            inspirations: "Add later to enrich your Persona.",
          },
          requiredNote: {
            essential:
              "LinkedIn is the only field you really need to move on. Website and blog: whenever you want.",
            voice:
              "Role, positioning, and language help a lot · reference posts can wait.",
            inspirations:
              "Everything here is optional. Add inspirations when you want to go deeper.",
          },
        },
        continue: "Continue",
      },
      audience: {
        title: "Who you write for",
        subtitle: "Optional · a rough sketch is enough. You can refine later.",
        stepBadge: "Optional",
        skip: "Skip for now",
        skipHint: "The AI will infer your reader from your profile. You can come back anytime.",
      },
      persona: {
        title: "Your Persona",
        subtitle:
          "What the AI understood about you. Review, tweak if needed, validate · everything stays editable.",
        reveal: {
          eyebrow: "AI summary",
          title: "Here's what the AI picked up",
          subtitle: "A quick look is enough to start. You'll refine as you post.",
          validatedEyebrow: "Persona active",
          validatedTitle: "Persona validated",
          validatedSubtitle: "Create now or keep refining whenever you want.",
          editHint: "Click to adjust · changes update your Persona.",
          promptHint: "Technical detail · editable anytime.",
          goCreate: "Create my first post →",
        },
        help: {
          guideTitle: "What is the Persona for?",
          guideHint: "Your editorial compass · it grows with use.",
          promptBody:
            "Text the AI reads on every generation. No need to master it now · editable anytime.",
          sections: {
            contentBrain: {
              title: "Your voice",
              body: "Positioning, tone, and topics. Gets sharper the more you use it.",
            },
            topicDna: {
              title: "Your themes",
              body: "Topics you cover (and what to avoid). Refine over time.",
            },
            operatingRules: {
              title: "LinkedIn style",
              body: "Format and credibility. The agent applies these on every post.",
            },
            learned: {
              title: "What the agent learns",
              body: "Feedback on posts enriches your Persona without overwriting your base.",
            },
            validate: {
              title: "Validate to create",
              body: "A quick validation unlocks creation. You can change everything later.",
            },
          },
        },
      },
    },
    settings: {
      llmKeyDialog: {
        title: "AI connection",
        body: "Trial: AI included. Pro: add your key to generate Persona and posts.",
        dismiss: "Later",
      },
    },
  },
  es: {
    landing: {
      howItWorks: {
        title: "Cómo funciona",
        subtitle: "Cuatro pasos simples. Afina sobre la marcha.",
        steps: {
          profile: {
            title: "Tu perfil",
            description: "Unos enlaces y una línea sobre ti. Lo mínimo para empezar.",
          },
          persona: {
            title: "Tu Persona",
            description: "La IA resume quién eres. Revisión rápida · editable en cualquier momento.",
          },
          brief: {
            title: "Un brief corto",
            description: "Di lo que quieres decir. El agente se encarga del resto.",
          },
          generate: {
            title: "Generar y elegir",
            description: "Varias propuestas. Te quedas con la que encaje.",
          },
        },
      },
      capabilities: {
        title: "Lo esencial para publicar en LinkedIn",
        subtitle: "Empieza rápido. Profundiza cuando quieras.",
        persona: {
          title: "Persona que aprende",
          description: "Un resumen de tu voz. Mejora con cada feedback que le das.",
        },
        brief: {
          title: "Brief simple",
          description: "Intención clara · no hace falta detallarlo todo el primer día.",
        },
        exploration: {
          title: "Varios ángulos",
          description: "Amplio y nicho en el mismo lote · eliges lo que suena a ti.",
        },
        quality: {
          title: "Calidad LinkedIn",
          description: "Puntuaciones y sugerencias para evitar contenido genérico.",
        },
        distribution: {
          title: "Formatos y actualidad",
          description: "Carrusel, vídeo, primer comentario · y temas de actualidad cuando los necesites.",
        },
        measurement: {
          title: "Mejora continua",
          description: "Tras publicar, el agente aprende lo que funcionó.",
        },
      },
    },
    setup: {
      steps: { llm: "Conexión IA" },
      onboarding: {
        progressLabel: "Recorrido: {percent} %",
        status: { locked: "Siguiente paso en breve" },
        welcome: {
          title: "Tu primer post en minutos",
          subtitle:
            "Empezamos simple. Nada es definitivo: podrás completar y afinar todo más tarde.",
          pillars: [
            "Lo mínimo para empezar · no hace falta ser perfecto el primer día.",
            "Cada paso se puede cambiar en cualquier momento.",
            "Cuanto más lo uses, más se parecerá a ti.",
          ],
          resumeHint: "Ya empezaste ({percent} %). Retoma cuando quieras.",
          ctaStart: "Empezar",
          ctaResume: "Retomar",
          ctaReady: "Crear un post",
        },
        hub: {
          completedEmpty: "Nada hecho aún · empieza por tu perfil.",
          steps: {
            setupLlm: {
              title: "Conexión IA",
              description: "Prueba: IA incluida. Pro: añade tu clave cuando quieras.",
            },
            authorEssential: {
              title: "Tu perfil",
              description: "LinkedIn + una línea sobre ti. El resto puede esperar.",
            },
            audience: {
              title: "Tu audiencia (opcional)",
              description: "Útil pero no obligatorio · sáltalo si prefieres probar ya.",
            },
            persona: {
              title: "Tu Persona",
              description:
                "Revisa el resumen de la IA. Valida para continuar · podrás editarlo después.",
            },
            startReady: {
              title: "Primer post",
              description: "Listo para probar.",
            },
          },
        },
        ready: {
          title: "Listo",
          subtitle:
            "Puedes crear ahora. Tu perfil y Persona seguirán mejorando con el uso.",
          check: {
            apiKey: "IA conectada",
            profile: "Perfil básico",
            audience: "Audiencia (o omitida)",
            persona: "Persona validada",
          },
          ctaCreate: "Crear mi primer post",
          ctaReviewPersona: "Revisar mi Persona",
        },
        wizard: {
          stepLabel: "Paso {current} de {total}",
          backToWelcome: "Vista general",
        },
        banner: {
          persona: {
            title: "Un último paso antes de crear",
            description:
              "Revisa rápido lo que la IA entendió de ti. Podrás cambiarlo todo después.",
          },
          llm: {
            title: "Conecta la IA",
            description:
              "Prueba: ya incluida. Si no, añade tu clave · puedes hacerlo más tarde en ajustes.",
          },
          author: {
            title: "Unos datos sobre ti",
            description:
              "LinkedIn y una línea de posicionamiento bastan para empezar. Todo lo demás es opcional.",
          },
          audience: {
            title: "Tu audiencia (opcional)",
            description: "Ayuda, pero puedes saltarlo y volver más tarde.",
          },
          generic: {
            title: "Casi listo",
            description: "Un paso más y podrás probar.",
          },
          cta: "Continuar · {step}",
        },
        guard: {
          checking: "Un momento…",
          redirecting: "Te llevamos al siguiente paso…",
        },
      },
      llm: {
        title: "Conexión IA",
        subtitle:
          "Prueba gratuita: la IA ya está activa, pasa al siguiente paso. Pro: conecta tu clave (ChatGPT, Claude, Gemini o Perplexity) · modificable en cualquier momento.",
        trialIncluded: {
          title: "IA incluida en tu prueba",
          body: "No necesitas clave para empezar. Podrás añadir una más tarde si pasas a Pro.",
          cta: "Continuar a Mi perfil →",
        },
        continue: "Continuar a Mi perfil →",
      },
      author: {
        subtitle:
          "LinkedIn + rol + posicionamiento: lo mínimo para empezar. Todo lo demás es opcional y editable después.",
        tabs: {
          hint: {
            essential: "LinkedIn y una línea sobre ti · lo estrictamente necesario.",
            voice: "Afina tu voz cuando tengas tiempo.",
            inspirations: "Añade más tarde para enriquecer tu Persona.",
          },
          requiredNote: {
            essential:
              "LinkedIn es el único campo realmente necesario para avanzar. Web y blog: cuando quieras.",
            voice:
              "Rol, posicionamiento e idioma ayudan mucho · los posts de referencia pueden esperar.",
            inspirations:
              "Todo aquí es opcional. Añade inspiraciones cuando quieras profundizar.",
          },
        },
        continue: "Continuar",
      },
      audience: {
        title: "Para quién escribes",
        subtitle: "Opcional · un boceto basta. Podrás precisar más tarde.",
        stepBadge: "Opcional",
        skip: "Saltar por ahora",
        skipHint: "La IA inferirá tu lector desde tu perfil. Puedes volver cuando quieras.",
      },
      persona: {
        title: "Tu Persona",
        subtitle:
          "Lo que la IA entendió de ti. Revisa, ajusta si hace falta, valida · todo sigue siendo editable.",
        reveal: {
          eyebrow: "Resumen IA",
          title: "Esto es lo que la IA retiene de ti",
          subtitle: "Un vistazo basta para empezar. Afinarás con cada post.",
          validatedEyebrow: "Persona activa",
          validatedTitle: "Persona validada",
          validatedSubtitle: "Crea ahora o sigue afinando cuando quieras.",
          editHint: "Clic para ajustar · los cambios actualizan tu Persona.",
          promptHint: "Detalle técnico · editable en cualquier momento.",
          goCreate: "Crear mi primer post →",
        },
        help: {
          guideTitle: "¿Para qué sirve el Persona?",
          guideHint: "Tu brújula editorial · crece con el uso.",
          promptBody:
            "Texto que la IA lee en cada generación. No hace falta dominarlo ahora · editable en cualquier momento.",
          sections: {
            contentBrain: {
              title: "Tu voz",
              body: "Posicionamiento, tono y temas. Se afina cuanto más lo usas.",
            },
            topicDna: {
              title: "Tus temas",
              body: "Temas que abordas (y los que evitar). Afinar progresivamente.",
            },
            operatingRules: {
              title: "Estilo LinkedIn",
              body: "Formato y credibilidad. El agente aplica estas reglas en cada post.",
            },
            learned: {
              title: "Lo que aprende el agente",
              body: "Tus feedbacks enriquecen el Persona sin borrar tu base.",
            },
            validate: {
              title: "Validar para crear",
              body: "Una validación rápida desbloquea la creación. Podrás cambiarlo todo después.",
            },
          },
        },
      },
    },
    settings: {
      llmKeyDialog: {
        title: "Conexión IA",
        body: "Prueba: IA incluida. Pro: añade tu clave para generar Persona y posts.",
        dismiss: "Más tarde",
      },
    },
  },
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      deepMerge(tv, sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

for (const locale of locales) {
  const path = join(root, "messages", `${locale}.json`);
  const data = JSON.parse(readFileSync(path, "utf8"));
  deepMerge(data, patches[locale]);
  writeFileSync(path, `${JSON.stringify(data, null, 1)}\n`, "utf8");
  console.log(`Updated ${locale}.json`);
}
