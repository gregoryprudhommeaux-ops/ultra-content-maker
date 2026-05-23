export type InspirationsReturnFrom =
  | "articles"
  | "articles-new"
  | "author"
  | "persona";

export type InspirationsReturnTarget = {
  href: string;
  labelKey:
    | "backToArticles"
    | "backToCreate"
    | "backToAuthor"
    | "backToPersona";
};

export function resolveInspirationsReturn(
  from: string | null,
): InspirationsReturnTarget {
  switch (from) {
    case "articles-new":
      return { href: "/articles/new?mode=inspiration", labelKey: "backToCreate" };
    case "author":
      return { href: "/setup/author", labelKey: "backToAuthor" };
    case "persona":
      return { href: "/persona", labelKey: "backToPersona" };
    case "articles":
    default:
      return { href: "/articles", labelKey: "backToArticles" };
  }
}
