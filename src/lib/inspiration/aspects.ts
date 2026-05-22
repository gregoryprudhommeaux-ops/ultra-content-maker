export const INSPIRATION_ASPECTS = [
  "tone",
  "angle",
  "subject",
  "approach",
  "content",
  "format",
] as const;

export type InspirationAspect = (typeof INSPIRATION_ASPECTS)[number];

export function isInspirationAspect(value: string): value is InspirationAspect {
  return (INSPIRATION_ASPECTS as readonly string[]).includes(value);
}
