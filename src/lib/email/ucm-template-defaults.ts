import type {
  SystemUcmEmailTemplateKey,
  UcmEmailTemplateDoc,
  UcmEmailTemplateKey,
  UcmEmailTemplateLocaleContent,
  UcmTemplateLocale,
} from "@/lib/email/ucm-template-types";
import {
  DEFAULT_UCM_TEMPLATE_LOCALE,
  isCustomUcmEmailTemplateKey,
  resolveUcmTemplateLocale,
  UCM_TEMPLATE_LOCALES,
} from "@/lib/email/ucm-template-types";

type LocalePack = Record<UcmTemplateLocale, UcmEmailTemplateLocaleContent>;

/**
 * Lucy · customer-facing UCM templates (FR/EN/ES).
 * Anti-slop: no survey openers, no moral close, no funnel dump, concrete CTA.
 */
const SYSTEM_DEFAULTS: Record<SystemUcmEmailTemplateKey, LocalePack> = {
  signup_welcome: {
    fr: {
      subject: "Bienvenue sur Ultra Content Maker",
      body: `Bonjour {{firstName}},

Votre compte est prêt.

Prochaine étape utile : remplir Mon profil (rôle, positionnement, langue) puis générer votre Persona. Sans ça, les brouillons restent trop génériques.

Ouvrir Mon profil :
{{dashboardUrl}}

Si quelque chose bloque à l’inscription, répondez à cet e-mail.

— Ultra Content Maker`,
    },
    en: {
      subject: "Welcome to Ultra Content Maker",
      body: `Hi {{firstName}},

Your account is ready.

Useful next step: fill in My profile (role, positioning, language), then generate your Persona. Without that, drafts stay too generic.

Open My profile:
{{dashboardUrl}}

If anything blocks you at signup, reply to this email.

— Ultra Content Maker`,
    },
    es: {
      subject: "Bienvenido a Ultra Content Maker",
      body: `Hola {{firstName}},

Tu cuenta ya está lista.

Siguiente paso útil: completa Mi perfil (rol, posicionamiento, idioma) y genera tu Persona. Sin eso, los borradores quedan demasiado genéricos.

Abrir Mi perfil:
{{dashboardUrl}}

Si algo te bloquea en el registro, responde a este correo.

— Ultra Content Maker`,
    },
  },

  weekly_content_ideas: {
    fr: {
      subject: "2 idées de posts pour cette semaine",
      body: `Bonjour {{firstName}},

Voici 2 pistes pour un prochain post LinkedIn — pas le texte final, juste l’angle et pourquoi ça peut coller à votre positionnement.

1) {{idea1Title}}
Pourquoi : {{idea1Why}}

2) {{idea2Title}}
Pourquoi : {{idea2Why}}

Choisissez une idée dans l’app : on prépare un brouillon à affiner, puis à publier.

Ouvrir mes idées :
{{libraryUrl}}

Créer un post :
{{createUrl}}

— Ultra Content Maker`,
    },
    en: {
      subject: "2 post ideas for this week",
      body: `Hi {{firstName}},

Here are 2 angles for a next LinkedIn post — not the final text, just the idea and why it may fit your positioning.

1) {{idea1Title}}
Why: {{idea1Why}}

2) {{idea2Title}}
Why: {{idea2Why}}

Pick one idea in the app: we prepare a draft you can refine, then publish.

Open my ideas:
{{libraryUrl}}

Create a post:
{{createUrl}}

— Ultra Content Maker`,
    },
    es: {
      subject: "2 ideas de posts para esta semana",
      body: `Hola {{firstName}},

Aquí van 2 pistas para un próximo post en LinkedIn — no es el texto final, solo el ángulo y por qué puede encajar con tu posicionamiento.

1) {{idea1Title}}
Por qué: {{idea1Why}}

2) {{idea2Title}}
Por qué: {{idea2Why}}

Elige una idea en la app: preparamos un borrador para afinar y luego publicar.

Abrir mis ideas:
{{libraryUrl}}

Crear un post:
{{createUrl}}

— Ultra Content Maker`,
    },
  },

  trial_ending_soon: {
    fr: {
      subject: "Votre essai se termine bientôt ({{trialDaysLeft}} j)",
      body: `Bonjour {{firstName}},

Il reste environ {{trialDaysLeft}} jour(s) sur votre essai Ultra Content Maker.

Si un brouillon vous a déjà servi, c’est le bon moment pour choisir Pro (votre clé API) ou Pro+ (clé plateforme). Sinon, finalisez un Persona et un premier post retenu avant la fin de fenêtre.

Voir les offres :
{{upgradeUrl}}

Continuer dans l’app :
{{dashboardUrl}}

— Ultra Content Maker`,
    },
    en: {
      subject: "Your trial ends soon ({{trialDaysLeft}} days)",
      body: `Hi {{firstName}},

You have about {{trialDaysLeft}} day(s) left on your Ultra Content Maker trial.

If a draft already helped you, this is a good time to pick Pro (your API key) or Pro+ (platform key). If not, finish a Persona and one retained post before the window closes.

See plans:
{{upgradeUrl}}

Continue in the app:
{{dashboardUrl}}

— Ultra Content Maker`,
    },
    es: {
      subject: "Tu prueba termina pronto ({{trialDaysLeft}} días)",
      body: `Hola {{firstName}},

Te quedan unos {{trialDaysLeft}} día(s) de prueba en Ultra Content Maker.

Si un borrador ya te sirvió, es buen momento para elegir Pro (tu clave API) o Pro+ (clave de plataforma). Si no, cierra un Persona y un primer post retenido antes de que cierre la ventana.

Ver planes:
{{upgradeUrl}}

Seguir en la app:
{{dashboardUrl}}

— Ultra Content Maker`,
    },
  },

  trial_expired: {
    fr: {
      subject: "Votre essai Ultra Content Maker est terminé",
      body: `Bonjour {{firstName}},

Votre période d’essai est close. Les brouillons déjà créés restent visibles ; la génération de nouveaux posts demande un plan actif.

Reprendre avec Pro ou Pro+ :
{{upgradeUrl}}

Se connecter :
{{loginUrl}}

— Ultra Content Maker`,
    },
    en: {
      subject: "Your Ultra Content Maker trial has ended",
      body: `Hi {{firstName}},

Your trial window is closed. Drafts you already created stay visible; generating new posts needs an active plan.

Continue with Pro or Pro+:
{{upgradeUrl}}

Sign in:
{{loginUrl}}

— Ultra Content Maker`,
    },
    es: {
      subject: "Tu prueba de Ultra Content Maker terminó",
      body: `Hola {{firstName}},

Tu periodo de prueba cerró. Los borradores que ya creaste siguen visibles; generar posts nuevos requiere un plan activo.

Continuar con Pro o Pro+:
{{upgradeUrl}}

Iniciar sesión:
{{loginUrl}}

— Ultra Content Maker`,
    },
  },

  first_post_nudge: {
    fr: {
      subject: "Un premier brouillon LinkedIn en 10 minutes",
      body: `Bonjour {{firstName}},

Votre compte existe depuis quelques jours, mais aucun brouillon n’est encore sorti.

Le chemin le plus court : mode Interview (ou Expertise) → brief → générer. Vous repartez avec un texte à corriger, pas une page blanche.

Lancer une création :
{{createUrl}}

— Ultra Content Maker`,
    },
    en: {
      subject: "A first LinkedIn draft in about 10 minutes",
      body: `Hi {{firstName}},

Your account has been around for a few days, and no draft has come out yet.

Shortest path: Interview (or Expertise) mode → brief → generate. You leave with text to edit, not a blank page.

Start creating:
{{createUrl}}

— Ultra Content Maker`,
    },
    es: {
      subject: "Un primer borrador de LinkedIn en unos 10 minutos",
      body: `Hola {{firstName}},

Tu cuenta lleva unos días y todavía no salió ningún borrador.

Camino más corto: modo Entrevista (o Expertise) → brief → generar. Sales con texto para corregir, no con una página en blanco.

Empezar a crear:
{{createUrl}}

— Ultra Content Maker`,
    },
  },

  payment_failed: {
    fr: {
      subject: "Paiement non abouti — Ultra Content Maker",
      body: `Bonjour {{firstName}},

Le dernier paiement de votre abonnement n’a pas abouti. L’accès peut être restreint tant que le règlement n’est pas régularisé.

Mettre à jour le moyen de paiement :
{{upgradeUrl}}

Questions facturation : répondez à cet e-mail.

— Ultra Content Maker`,
    },
    en: {
      subject: "Payment did not go through — Ultra Content Maker",
      body: `Hi {{firstName}},

Your latest subscription payment did not go through. Access may stay limited until billing is fixed.

Update payment method:
{{upgradeUrl}}

Billing questions: reply to this email.

— Ultra Content Maker`,
    },
    es: {
      subject: "Pago no completado — Ultra Content Maker",
      body: `Hola {{firstName}},

El último pago de tu suscripción no se completó. El acceso puede quedar limitado hasta regularizar el cobro.

Actualizar método de pago:
{{upgradeUrl}}

Dudas de facturación: responde a este correo.

— Ultra Content Maker`,
    },
  },

  inactivity_nudge: {
    fr: {
      subject: "Reprendre un post LinkedIn là où vous l’avez laissé",
      body: `Bonjour {{firstName}},

Ça fait un moment sans activité sur Ultra Content Maker.

Si une idée traîne, ouvrez la bibliothèque : les brouillons déjà générés sont toujours là. Sinon, les idées du jeudi (quand activées) ou une interview courte remettent une session en route.

Bibliothèque :
{{libraryUrl}}

Créer :
{{createUrl}}

— Ultra Content Maker`,
    },
    en: {
      subject: "Pick up a LinkedIn post where you left it",
      body: `Hi {{firstName}},

It has been a while without activity on Ultra Content Maker.

If an idea is sitting somewhere, open the library: drafts you already generated are still there. If not, Thursday ideas (when enabled) or a short interview restart a session.

Library:
{{libraryUrl}}

Create:
{{createUrl}}

— Ultra Content Maker`,
    },
    es: {
      subject: "Retoma un post de LinkedIn donde lo dejaste",
      body: `Hola {{firstName}},

Hace un rato sin actividad en Ultra Content Maker.

Si tienes una idea a medias, abre la biblioteca: los borradores que ya generaste siguen ahí. Si no, las ideas del jueves (cuando estén activas) o una entrevista corta reinician una sesión.

Biblioteca:
{{libraryUrl}}

Crear:
{{createUrl}}

— Ultra Content Maker`,
    },
  },
};

const CUSTOM_STARTER: LocalePack = {
  fr: {
    subject: "Message Ultra Content Maker",
    body: `Bonjour {{firstName}},

[Écrire le message ici]

{{dashboardUrl}}

— Ultra Content Maker`,
  },
  en: {
    subject: "Ultra Content Maker message",
    body: `Hi {{firstName}},

[Write your message here]

{{dashboardUrl}}

— Ultra Content Maker`,
  },
  es: {
    subject: "Mensaje de Ultra Content Maker",
    body: `Hola {{firstName}},

[Escribe el mensaje aquí]

{{dashboardUrl}}

— Ultra Content Maker`,
  },
};

export function defaultLocaleContent(
  key: UcmEmailTemplateKey,
  locale: UcmTemplateLocale,
): UcmEmailTemplateLocaleContent {
  if (isCustomUcmEmailTemplateKey(key)) {
    return CUSTOM_STARTER[locale] ?? CUSTOM_STARTER.fr;
  }
  const pack = SYSTEM_DEFAULTS[key as SystemUcmEmailTemplateKey];
  return pack?.[locale] ?? pack?.fr ?? CUSTOM_STARTER.fr;
}

export function defaultEmailTemplate(
  key: UcmEmailTemplateKey,
  locale: UcmTemplateLocale = DEFAULT_UCM_TEMPLATE_LOCALE,
  opts?: { label?: string },
): UcmEmailTemplateDoc {
  const locales = Object.fromEntries(
    UCM_TEMPLATE_LOCALES.map((loc) => [loc, defaultLocaleContent(key, loc)]),
  ) as Record<UcmTemplateLocale, UcmEmailTemplateLocaleContent>;
  const resolved = resolveUcmTemplateLocale(locale);
  const content = locales[resolved];
  return {
    key,
    subject: content.subject,
    body: content.body,
    locale: resolved,
    locales,
    enabled: true,
    ...(isCustomUcmEmailTemplateKey(key)
      ? { custom: true, label: opts?.label?.trim() || undefined }
      : {}),
  };
}
