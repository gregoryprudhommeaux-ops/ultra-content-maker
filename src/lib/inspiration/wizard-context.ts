import type {
 ArticleInspirationSource,
 InspirationAspect,
 SourceCategory,
 SourceLink,
} from "@/types/workspace";

export type InspirationInputKind = "paste" | "url" | "library";

export type WizardInspirationContext = {
 kind: InspirationInputKind;
 sourceId?: string;
 url?: string;
 label?: string;
 category?: SourceCategory;
 likedAspects?: InspirationAspect[];
 whyLike?: string;
 /** Pasted post, URL excerpt, or optional supplement for library sources */
 excerpt: string;
};

export function buildReferenceTextFromLibrarySource(
 source: Pick<
 SourceLink,
 "url" | "label" | "category" | "likedAspects" | "whyLike"
 >,
 excerpt?: string,
): string {
 const aspectLine = source.likedAspects?.length
 ? `Aspects to borrow (structure/tone, not wording): ${source.likedAspects.join(", ")}`
 : "";
 const parts = [
 `Inspiration type: ${source.category ?? "inspiration_post"}`,
 `Source URL: ${source.url}`,
 source.label ? `Label: ${source.label}` : "",
 source.whyLike ? `Why the author likes this reference: ${source.whyLike}` : "",
 aspectLine,
 excerpt?.trim()
 ? `Reference excerpt (if any):\n${excerpt.trim()}`
 : "No excerpt provided · use URL and metadata only; do not invent quoted sentences from the page.",
 ];
 return parts.filter(Boolean).join("\n\n");
}

export function buildReferenceTextFromUrl(url: string, excerpt: string): string {
 return [
 `Source URL: ${url.trim()}`,
 "No automatic page fetch · author-provided excerpt below.",
 "",
 excerpt.trim(),
 ].join("\n");
}

export function buildWizardInspirationReferenceText(
 ctx: WizardInspirationContext,
 librarySource?: SourceLink | null,
): string {
 if (ctx.kind === "paste") {
 return ctx.excerpt.trim();
 }
 if (ctx.kind === "url" && ctx.url) {
 return buildReferenceTextFromUrl(ctx.url, ctx.excerpt);
 }
 if (ctx.kind === "library" && librarySource) {
 return buildReferenceTextFromLibrarySource(librarySource, ctx.excerpt);
 }
 if (ctx.kind === "library" && ctx.url) {
 return buildReferenceTextFromLibrarySource(
 {
 url: ctx.url,
 label: ctx.label,
 category: ctx.category ?? "inspiration_post",
 likedAspects: ctx.likedAspects,
 whyLike: ctx.whyLike,
 },
 ctx.excerpt,
 );
 }
 return ctx.excerpt.trim();
}

export function toArticleInspirationSource(
 ctx: WizardInspirationContext,
 librarySource?: SourceLink | null,
): ArticleInspirationSource | undefined {
 const url =
 ctx.url?.trim() ||
 librarySource?.url?.trim() ||
 (ctx.kind === "url" ? "" : undefined);
 if (!url) return undefined;

 return {
 kind: ctx.kind,
 sourceId: ctx.sourceId ?? librarySource?.id,
 url,
 label: ctx.label ?? librarySource?.label,
 category: ctx.category ?? librarySource?.category,
 likedAspects: ctx.likedAspects ?? librarySource?.likedAspects,
 whyLike: ctx.whyLike ?? librarySource?.whyLike,
 };
}

const MIN_REFERENCE_CHARS = 40;

export function isWizardInspirationContextReady(
 ctx: WizardInspirationContext | null,
 librarySource?: SourceLink | null,
): boolean {
 if (!ctx) return false;
 const text = buildWizardInspirationReferenceText(ctx, librarySource);
 if (text.trim().length < MIN_REFERENCE_CHARS) return false;
 if (ctx.kind === "url") {
 return Boolean(ctx.url?.trim()) && ctx.excerpt.trim().length >= MIN_REFERENCE_CHARS;
 }
 if (ctx.kind === "library") {
 return Boolean(librarySource || ctx.url);
 }
 return ctx.excerpt.trim().length >= MIN_REFERENCE_CHARS;
}
