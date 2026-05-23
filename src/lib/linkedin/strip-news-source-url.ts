import type { ArticleNewsSource } from "@/types/workspace";

/** Remove source citation lines / raw news URL from post text (link belongs in first comment). */
export function stripNewsSourceUrlFromText(
  text: string,
  source: Pick<ArticleNewsSource, "url" | "sourceName" | "title">,
): string {
  const url = source.url.trim();
  if (!url) return text.trim();

  const publisher = source.sourceName?.trim() || source.title.trim();
  const lines = text.split("\n");

  const filtered = lines.filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (t.includes(url)) return false;
    if (/^(source|fuente)\s*:/i.test(t)) return false;
    if (publisher && t.toLowerCase().includes(publisher.toLowerCase()) && /https?:\/\//i.test(t)) {
      return false;
    }
    return true;
  });

  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
