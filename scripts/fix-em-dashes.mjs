#!/usr/bin/env node
/**
 * Remove em dashes (—) from i18n strings by reformulating sentences.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LOCALES = ["fr", "en", "es"];
const TARGETS = [
  ...LOCALES.map((l) => path.join("messages", `${l}.json`)),
  path.join("scripts", "i18n-bundles.json"),
  path.join("scripts", "i18n-admin-bundles.json"),
];

const PLACEHOLDER = { fr: "N/D", en: "N/A", es: "N/D" };

/** Exact string overrides per locale (highest priority). */
const EXACT = {
  fr: {
    "—": PLACEHOLDER.fr,
    "Console OpenAI — API keys": "Console OpenAI · clés API",
    "Paramètres Perplexity — API": "Paramètres Perplexity · API",
    "Console Anthropic — API keys": "Console Anthropic · clés API",
    "Google AI Studio — API key": "Google AI Studio · clé API",
    "Aperçu OK — MRR estimé : {mrr} $": "Aperçu OK. MRR estimé : {mrr} $",
    "Merci — votre signalement a été envoyé.": "Merci. Votre signalement a été envoyé.",
    "Lien copié — envoyez-le à votre cliente": "Lien copié. Envoyez-le à votre cliente.",
    "Ajouté — vous pouvez en ajouter une autre ci-dessous.": "Ajouté. Vous pouvez en ajouter une autre ci-dessous.",
    "Profil complet — optionnel": "Profil complet (optionnel)",
    "Prompt Persona complet — Pro": "Prompt Persona complet (Pro)",
    "Sélectionné — brief prérempli": "Sélectionné, brief prérempli",
    "Revenez ici — le radar se mettra à jour automatiquement.": "Revenez ici : le radar se mettra à jour automatiquement.",
    "👉 Découvrez comment nous pouvons vous aider — commentez ou envoyez-moi un message.":
      "👉 Découvrez comment nous pouvons vous aider : commentez ou envoyez-moi un message.",
  },
  en: {
    "—": PLACEHOLDER.en,
    "OpenAI platform — API keys": "OpenAI platform · API keys",
    "Perplexity settings — API": "Perplexity settings · API",
    "Anthropic console — API keys": "Anthropic console · API keys",
    "Google AI Studio — API key": "Google AI Studio · API key",
    "Thanks — report sent.": "Thanks. Report sent.",
    "Link copied — send it to your client": "Link copied. Send it to your client.",
    "Added — you can add another below.": "Added. You can add another below.",
    "Full profile — optional": "Full profile (optional)",
    "Full Persona prompt — Pro": "Full Persona prompt (Pro)",
    "Selected — brief prefilled": "Selected, brief prefilled",
    "Come back here — the radar will refresh automatically.": "Come back here: the radar will refresh automatically.",
  },
  es: {
    "—": PLACEHOLDER.es,
    "OpenAI — API keys": "OpenAI · claves API",
    "Perplexity — API": "Perplexity · API",
    "Anthropic — API keys": "Anthropic · claves API",
    "Google AI Studio — API key": "Google AI Studio · clave API",
    "Gracias — informe enviado.": "Gracias. Informe enviado.",
    "Enlace copiado — envíaselo a tu clienta": "Enlace copiado. Envíaselo a tu clienta.",
    "Guardado — puedes añadir otra abajo.": "Guardado. Puedes añadir otra abajo.",
    "Perfil completo — opcional": "Perfil completo (opcional)",
    "Prompt Persona completo — Pro": "Prompt Persona completo (Pro)",
    "Seleccionado — brief prellenado": "Seleccionado, brief prellenado",
    "Vuelve aquí — el radar se actualizará automáticamente.": "Vuelve aquí: el radar se actualizará automáticamente.",
  },
};

const LOWER_CONTINUATION =
  /^(no|not|sin|sans|you|tu|la|le|el|les|the|un|une|a|an|or|ou|y|et|and|then|puis|luego|después|editable|optional|opcional|optionnel|once|une|una|sin|not|never|jamais|nunca|including|incl|avec|with|con|pour|for|para|from|de|desde|it|il|elle|they|retry|réessay|vuelve|keep|garde|use|usa|utilise|not yet|pas encore|aún|still|todo|tout|all|todos|everything|toute|whole|même|same|mismo|just|juste|solo|only|seulement|so|donc|así|when|quand|cuando|if|si|si\b|without|sans|sin\b|before|avant|antes|after|après|después|while|pendant|mientras|because|car|porque|because|via|par|por|through|through|through|into|en\b|into|toward|vers|hacia|into|within|dans|en\b|inside|inside|about|sur|sobre|over|over|over|below|below|below|above|ci|above|here|ici|aquí|there|là|allí|now|maintenant|ahora|today|aujourd|hoy|tomorrow|demain|mañana|every|chaque|cada|each|chaque|cada|fresh|nouveau|nuevo|new|nouveau|nuevo|no endless|sans scroll|sin scroll)/i;

function rewriteEmDash(text, locale) {
  if (EXACT[locale]?.[text]) return EXACT[locale][text];

  let s = text;

  // Provider / product link labels: "Name — API"
  s = s.replace(/\s—\s(?=API\b|clés|claves|clé\b|clave\b|keys\b|key\b|settings\b|console\b|platform\b|Paramètres|Console|Google)/gi, " · ");

  // Thanks / confirmation prefix
  s = s.replace(/^(Merci|Thanks|Gracias|Ajouté|Added|Guardado|Lien copié|Link copied|Enlace copiado)\s—\s/i, (_, w) => `${w}. `);

  // "X — Y" with spaced em dash
  s = s.replace(/\s—\s/g, (match, offset, str) => {
    const after = str.slice(offset + 3).trimStart();
    if (!after) return ": ";

    // Parenthetical optional: "title — optional"
    if (/^(optionnel|optional|opcional)\b/i.test(after)) return " (";
    if (/^(Pro\b|Pro\+)/i.test(after)) return " (";

    // Second clause starts with lowercase continuation / negation
    if (LOWER_CONTINUATION.test(after)) return ", ";

    // Question or exclamation in second part
    if (/^[«"(\[]/.test(after)) return " : ";

    // New sentence (capital letter)
    if (/^[A-ZÀ-ÖØ-ÞÉÍÓÚÑ]/.test(after)) return ". ";

    // Default: colon for explanation
    return " : ";
  });

  // Tight em dash (no spaces): word—word
  s = s.replace(/(\S)—(\S)/g, (_, before, after) => {
    if (LOWER_CONTINUATION.test(after)) return `${before}, ${after}`;
    if (/^[A-ZÀ-ÖØ-Þ]/.test(after)) return `${before}. ${after}`;
    return `${before} : ${after}`;
  });

  // Fix broken optional parens from "title (optional" missing closing paren
  if (/\(optionnel|optional|opcional|Pro\b|Pro\+/i.test(s) && !/\)\.?$/.test(s) && s.includes("(")) {
    // only add ) before trailing period if we opened with optional pattern
    s = s.replace(/\((optionnel|optional|opcional)(\.)?$/, "($1)$2");
    s = s.replace(/\((Pro\+?)(\.)?$/, "($1)$2");
  }

  if (EXACT[locale]?.[s]) return EXACT[locale][s];
  return s;
}

function walk(obj, locale, stats) {
  if (typeof obj === "string") {
    if (obj.includes("—")) {
      stats.before++;
      const next = rewriteEmDash(obj, locale);
      if (next.includes("—")) stats.remaining.push(next);
      stats.after += next.includes("—") ? 0 : 1;
      return next;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map((v) => walk(v, locale, stats));
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = walk(v, locale, stats);
    return out;
  }
  return obj;
}

for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const isBundle = rel.includes("bundles.json");
  const stats = { before: 0, after: 0, remaining: [] };

  if (isBundle) {
    const bundles = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const locale of LOCALES) {
      if (!bundles[locale]) continue;
      bundles[locale] = walk(bundles[locale], locale, stats);
    }
    fs.writeFileSync(file, `${JSON.stringify(bundles, null, 2)}\n`, "utf8");
  } else {
    const locale = path.basename(rel, ".json");
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const next = walk(json, locale, stats);
    fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  console.log(`${rel}: ${stats.before} strings touched, ${stats.remaining.length} still contain —`);
  if (stats.remaining.length) {
    stats.remaining.slice(0, 10).forEach((s) => console.log("  ", s.slice(0, 100)));
  }
}
