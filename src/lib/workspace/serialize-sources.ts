import type { SourceLink } from "@/types/workspace";

export type PersonaSourcePayload = {
  type: string;
  url: string;
  label?: string;
  likedAspects?: string[];
  whyLike?: string;
};

export function serializeSourcesForPersona(sources: SourceLink[]) {
  const map = (list: SourceLink[]): PersonaSourcePayload[] =>
    list.map((s) => ({
      type: s.type,
      url: s.url,
      label: s.label,
      ...(s.likedAspects?.length ? { likedAspects: s.likedAspects } : {}),
      ...(s.whyLike?.trim() ? { whyLike: s.whyLike.trim() } : {}),
    }));

  return {
    myPosts: map(sources.filter((s) => s.category === "my_post")),
    inspirationPosts: map(sources.filter((s) => s.category === "inspiration_post")),
    inspirationProfiles: map(
      sources.filter((s) => s.category === "inspiration_profile"),
    ),
  };
}
