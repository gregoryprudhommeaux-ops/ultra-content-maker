import { getSiteUrl } from "@/lib/brand/site-url";
import { formatHashtagsLine } from "@/lib/linkedin/hashtags";
import type { ArticleDoc } from "@/types/workspace";

export function getMarketingSiteUrl(): string {
 return `${getSiteUrl()}/?marketing=1`;
}

/** Article body for internal share (excludes UCM attribution). */
export function buildArticleShareContent(article: ArticleDoc): string {
 if (article.status === "validated" && article.exportText?.trim()) {
 return article.exportText.trim();
 }

 const parts: string[] = [];
 if (article.hook?.trim()) parts.push(article.hook.trim());
 if (article.body?.trim()) parts.push(article.body.trim());
 if (article.ps?.trim()) parts.push(article.ps.trim());
 const tagLine = formatHashtagsLine(article.hashtags ?? []);
 if (tagLine) parts.push(tagLine);
 return parts.join("\n\n");
}

export function buildShareAttribution(attributionLine: string): string {
 return attributionLine.trim();
}

export function buildFullShareText(
 article: ArticleDoc,
 attributionLine: string,
): string {
 const content = buildArticleShareContent(article);
 const attribution = buildShareAttribution(attributionLine);
 if (!content) return attribution;
 return `${content}\n\n · \n\n${attribution}`;
}

export function buildShareEmailSubject(subjectTemplate: string, article: ArticleDoc): string {
 const hookLine = article.hook?.trim().split("\n")[0] ?? "";
 const truncated =
 hookLine.length > 80 ? `${hookLine.slice(0, 77).trim()}…` : hookLine;
 return subjectTemplate.replace("{hook}", truncated || "…");
}

export function buildMailtoHref(subject: string, body: string): string {
 const params = new URLSearchParams({
 subject,
 body,
 });
 return `mailto:?${params.toString()}`;
}

export function buildWhatsAppHref(text: string): string {
 return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
