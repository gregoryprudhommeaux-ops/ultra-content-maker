import { defaultModelForProvider } from "@/lib/llm/providers";

const IMAGE_OCR_PROMPT =
  "Extrais tout le texte lisible de cette image (OCR). Si l'image ne contient pas de texte, décris brièvement son contenu utile pour construire un profil professionnel LinkedIn (CV, carte de visite, diplôme, capture d'écran, etc.). Réponds en texte brut uniquement, sans markdown ni JSON.";

function normalizeImageMime(mimeType: string, fileName: string): string {
  const type = mimeType.toLowerCase();
  if (type.startsWith("image/")) return type;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

async function extractImageWithGemini(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  apiKey: string,
): Promise<string> {
  const model = process.env.GOOGLE_MODEL?.trim() || defaultModelForProvider("google");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const normalizedMime = normalizeImageMime(mimeType, fileName);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: IMAGE_OCR_PROMPT },
            {
              inline_data: {
                mime_type: normalizedMime,
                data: buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.2,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`google_vision: ${(await res.text()).slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) throw new Error("empty_extracted_text");
  return text;
}

async function extractImageWithOpenAi(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  apiKey: string,
): Promise<string> {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o";
  const dataUrl = `data:${normalizeImageMime(mimeType, fileName)};base64,${buffer.toString("base64")}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: IMAGE_OCR_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`openai_vision: ${(await res.text()).slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("empty_extracted_text");
  return text;
}

export async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const googleKey = process.env.GOOGLE_API_KEY?.trim();
  if (googleKey && googleKey.length >= 8) {
    return extractImageWithGemini(buffer, mimeType, fileName, googleKey);
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey && openaiKey.length >= 8) {
    return extractImageWithOpenAi(buffer, mimeType, fileName, openaiKey);
  }

  throw new Error("image_ocr_unavailable");
}

export function isImageUpload(mimeType: string, fileName: string): boolean {
  const type = mimeType.toLowerCase();
  const lower = fileName.toLowerCase();
  return (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png")
  );
}
