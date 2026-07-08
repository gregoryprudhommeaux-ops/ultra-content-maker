"use client";

import { FORM_SECTION_TITLE } from "@/lib/ui/nextstep";
import type { InspirationInputKind } from "@/types/workspace";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  onSelect: (kind: InspirationInputKind) => void;
  libraryCount: number;
};

export function InspirationSourceChoice({ onSelect, libraryCount }: Props) {
  const t = useTranslations("setup.articles.create.inspiration");

  const options: {
    id: InspirationInputKind;
    title: string;
    desc: string;
    disabled?: boolean;
  }[] = [
    {
      id: "paste",
      title: t("input.paste.title"),
      desc: t("input.paste.desc"),
    },
    {
      id: "url",
      title: t("input.url.title"),
      desc: t("input.url.desc"),
    },
    {
      id: "library",
      title: t("input.library.title"),
      desc:
        libraryCount > 0
          ? t("input.library.desc", { count: libraryCount })
          : t("input.library.descEmpty"),
      disabled: libraryCount === 0,
    },
    {
      id: "document",
      title: t("input.document.title"),
      desc: t("input.document.desc"),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className={FORM_SECTION_TITLE}>{t("inputTitle")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("inputSubtitle")}</p>
      </div>
      <div className="grid gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            onClick={() => onSelect(opt.id)}
            className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-ns-primary hover:bg-ns-brand-light/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <p className="font-semibold text-ns-tertiary">{opt.title}</p>
            <p className="mt-1 text-sm text-ns-secondary">{opt.desc}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-ns-secondary">
        {t("manageLibrary")}{" "}
        <Link
          href="/setup/author?tab=inspirations&from=articles-new"
          className="font-medium underline"
        >
          {t("manageLibraryLink")}
        </Link>
      </p>
    </div>
  );
}
