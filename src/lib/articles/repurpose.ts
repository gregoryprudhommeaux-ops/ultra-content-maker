import type { ArticleRepurpose, CarouselSlide } from "@/types/workspace";

function normalizeSlides(raw: unknown): CarouselSlide[] {
  if (!Array.isArray(raw)) return [];
  const out: CarouselSlide[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const bulletsRaw = o.bullets;
    const bullets = Array.isArray(bulletsRaw)
      ? bulletsRaw
          .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
          .map((b) => b.trim())
          .slice(0, 5)
      : [];
    if (!title || bullets.length === 0) continue;
    out.push({ title, bullets });
  }
  return out.slice(0, 7);
}

export function normalizeArticleRepurpose(raw: unknown): ArticleRepurpose | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const result: ArticleRepurpose = {};

  const carouselRaw = o.carousel;
  if (carouselRaw && typeof carouselRaw === "object") {
    const c = carouselRaw as Record<string, unknown>;
    const slides = normalizeSlides(c.slides);
    if (slides.length >= 3) {
      result.carousel = {
        slides,
        designNotes:
          typeof c.designNotes === "string" ? c.designNotes.trim() : undefined,
      };
    }
  }

  const videoRaw = o.videoScript;
  if (videoRaw && typeof videoRaw === "object") {
    const v = videoRaw as Record<string, unknown>;
    const hookLine = typeof v.hookLine === "string" ? v.hookLine.trim() : "";
    const closingLine =
      typeof v.closingLine === "string" ? v.closingLine.trim() : "";
    const segmentsRaw = v.segments;
    const segments = Array.isArray(segmentsRaw)
      ? segmentsRaw
          .filter((s) => s && typeof s === "object")
          .map((s) => {
            const seg = s as Record<string, unknown>;
            const label = typeof seg.label === "string" ? seg.label.trim() : "";
            const script = typeof seg.script === "string" ? seg.script.trim() : "";
            const durationSec =
              typeof seg.durationSec === "number" ? seg.durationSec : undefined;
            return label && script ? { label, script, durationSec } : null;
          })
          .filter((s): s is NonNullable<typeof s> => !!s)
          .slice(0, 6)
      : [];
    if (hookLine && segments.length >= 2 && closingLine) {
      result.videoScript = {
        hookLine,
        segments,
        closingLine,
        totalDurationSec:
          typeof v.totalDurationSec === "number" ? v.totalDurationSec : undefined,
      };
    }
  }

  if (!result.carousel && !result.videoScript) return undefined;
  return result;
}
