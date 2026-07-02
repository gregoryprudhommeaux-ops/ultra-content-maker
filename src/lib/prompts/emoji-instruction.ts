import type { ContentLanguage, EmojiLevel } from "@/types/workspace";

const INSTRUCTIONS: Record<
 EmojiLevel,
 Record<ContentLanguage, string>
> = {
 none: {
 fr: "STRICT : aucun emoji Unicode dans hook, corps ni PS.",
 en: "STRICT: zero Unicode emojis in hook, body, or PS.",
 es: "ESTRICTO: ningún emoji Unicode en gancho, cuerpo ni PS.",
 },
 light: {
 fr: "OBLIGATOIRE : chaque post doit contenir 1 à 3 emojis Unicode visibles et pertinents (ex. 💡 📌 🎯 ✅ dans l'accroche ou le corps). Ne jamais livrer un post sans emoji. Style LinkedIn pro, pas enfantin.",
 en: "REQUIRED: each post MUST contain 1–3 visible, relevant Unicode emojis (e.g. 💡 📌 🎯 ✅ in the hook or body). Never deliver a post with zero emojis. Professional LinkedIn tone.",
 es: "OBLIGATORIO: cada post debe incluir 1–3 emojis Unicode visibles y pertinentes (p. ej. 💡 📌 🎯 ✅ en el gancho o cuerpo). Nunca entregues un post sin emojis. Tono LinkedIn profesional.",
 },
 heavy: {
 fr: "OBLIGATOIRE : chaque post doit contenir 4 à 8 emojis Unicode répartis (accroche, puces, conclusion). Ton vivant mais professionnel · pas de chaînes d'emojis enfantines.",
 en: "REQUIRED: each post MUST contain 4–8 Unicode emojis spread across hook, bullets, and close. Lively but professional · no childish emoji spam.",
 es: "OBLIGATORIO: cada post debe incluir 4–8 emojis Unicode (gancho, viñetas, cierre). Vivo pero profesional · sin spam infantil.",
 },
};

export function emojiInstruction(
 level: EmojiLevel = "light",
 contentLanguage: ContentLanguage = "en",
): string {
 return INSTRUCTIONS[level][contentLanguage] ?? INSTRUCTIONS[level].en;
}

/** Detect visible emoji in post text (LinkedIn-style Unicode pictographs). */
export function textContainsEmoji(text: string): boolean {
 if (!text) return false;
 try {
 return /\p{Extended_Pictographic}/u.test(text);
 } catch {
 return /[\u{1F300}-\u{1FAFF}]/u.test(text);
 }
}

export function postContainsEmoji(parts: {
 hook?: string;
 body?: string;
 ps?: string;
}): boolean {
 return textContainsEmoji(
 [parts.hook, parts.body, parts.ps].filter(Boolean).join("\n"),
 );
}
