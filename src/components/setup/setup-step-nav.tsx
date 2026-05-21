"use client";

import { META_LABEL } from "@/lib/ui/nextstep";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const STEPS = [
  { key: "llm", href: "/setup/llm" },
  { key: "author", href: "/setup/author" },
  { key: "audience", href: "/setup/audience" },
  { key: "persona", href: "/persona" },
  { key: "articles", href: "/articles" },
] as const;

type StepLabelKey = (typeof STEPS)[number]["key"];

export function SetupStepNav() {
  const pathname = usePathname();
  const t = useTranslations("setup.steps");
  const labels: Record<StepLabelKey, string> = {
    llm: t("llm"),
    author: t("author"),
    audience: t("audience"),
    persona: t("persona"),
    articles: t("articles"),
  };

  return (
    <ol className="mb-8 flex flex-wrap gap-2">
      {STEPS.map(({ key, href }, i) => {
        const active = pathname?.includes(href);
        return (
          <li key={key} className="flex items-center gap-2">
            {i > 0 && <span className="text-ns-alternate">→</span>}
            <Link
              href={href}
              className={`${META_LABEL} rounded-sm px-2 py-1 transition-colors ${
                active
                  ? "bg-ns-primary text-black"
                  : "text-ns-secondary hover:border-ns-primary hover:text-ns-tertiary"
              }`}
            >
              {i + 1}. {labels[key]}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
