/**
 * Sync FR/ES message files from EN source using OpenAI.
 * Usage: npm run i18n:sync
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const LOCALES = ["fr", "es"] as const;

async function translate(
  enJson: Record<string, unknown>,
  targetLocale: string,
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for i18n:sync");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You translate UI strings for a B2B SaaS app. Target locale: ${targetLocale}. Keep JSON keys identical. Preserve placeholders like {name}. Keep brand names "ULTRA CONTENT MAKER" and "Content Brain" unchanged. Return only valid JSON.`,
        },
        {
          role: "user",
          content: JSON.stringify(enJson, null, 2),
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return JSON.parse(content) as Record<string, unknown>;
}

async function main() {
  const enPath = resolve(ROOT, "messages/en.json");
  const en = JSON.parse(readFileSync(enPath, "utf8")) as Record<string, unknown>;

  for (const locale of LOCALES) {
    console.log(`Translating → ${locale}…`);
    const translated = await translate(en, locale);
    const outPath = resolve(ROOT, `messages/${locale}.json`);
    writeFileSync(outPath, `${JSON.stringify(translated, null, 2)}\n`);
    console.log(`Wrote ${outPath}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
