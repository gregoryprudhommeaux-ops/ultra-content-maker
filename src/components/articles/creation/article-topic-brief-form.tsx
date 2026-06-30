"use client";

import {
  isArticleTopicBriefComplete,
} from "@/lib/prompts/post-brief";
import { parseArticleTopicFields, ARTICLE_TOPIC_CTA_PREFIX } from "@/lib/articles/article-topic-fields";
import {
  ARTICLE_WRITING_STYLES,
  resolveArticleWritingStyle,
} from "@/lib/articles/article-writing-style";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import type { ArticleWritingStyle, PostBrief } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ContextHelp } from "@/components/ui/context-help";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

type ParsedTopicBrief = ReturnType<typeof parseArticleTopicFields>;

function parseTopicBrief(brief: PostBrief): ParsedTopicBrief {
  return parseArticleTopicFields(brief);
}

function buildTopicBrief(
  fields: ParsedTopicBrief,
  articleWritingStyle?: ArticleWritingStyle,
): PostBrief {
  const proofParts: string[] = [];
  if (fields.example.trim()) proofParts.push(fields.example.trim());
  if (fields.ctaHint.trim()) {
    proofParts.push(`${ARTICLE_TOPIC_CTA_PREFIX}${fields.ctaHint.trim()}`);
  }

  return normalizePostBrief({
    objectives: [{ objective: "conversation", priority: 1 }],
    problem: fields.topic,
    pointOfView: fields.message,
    proof: proofParts.join("\n\n"),
    ...(articleWritingStyle ? { articleWritingStyle } : {}),
  });
}

type Props = {
  brief: PostBrief;
  onChange: (brief: PostBrief) => void;
};

export function ArticleTopicBriefForm({ brief, onChange }: Props) {
  const t = useTranslations("setup.articles.create.articleTopic");
  const fields = useMemo(() => parseTopicBrief(brief), [brief]);
  const writingStyle = resolveArticleWritingStyle(brief);
  const complete = isArticleTopicBriefComplete(brief);

  function update(patch: Partial<ParsedTopicBrief>) {
    onChange(buildTopicBrief({ ...fields, ...patch }, writingStyle));
  }

  function setWritingStyle(style: ArticleWritingStyle) {
    onChange(buildTopicBrief(fields, style));
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 md:p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      <div>
        <p className={LABEL_CLASS}>{t("writingStyleLabel")}</p>
        <p className="mt-1 text-xs text-ns-secondary">{t("writingStyleHint")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ARTICLE_WRITING_STYLES.map((style) => {
            const selected = writingStyle === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => setWritingStyle(style)}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-ns-primary bg-ns-brand-light text-ns-tertiary shadow-[inset_0_0_0_1px_rgba(157,196,26,0.35)]"
                    : "border-gray-100 text-ns-secondary hover:border-ns-primary/40"
                }`}
                aria-pressed={selected}
              >
                <span className="block text-sm font-semibold">{t(`writingStyle.${style}.title`)}</span>
                <span className="mt-1 block text-xs leading-snug text-ns-secondary">
                  {t(`writingStyle.${style}.desc`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label className={LABEL_CLASS} htmlFor="article-topic">
            {t("topicLabel")}
          </label>
          <ContextHelp label={t("topicHelpLabel")}>{t("topicHelp")}</ContextHelp>
        </div>
        <input
          id="article-topic"
          type="text"
          value={fields.topic}
          onChange={(e) => update({ topic: e.target.value })}
          placeholder={t("topicPlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label className={LABEL_CLASS} htmlFor="article-message">
            {t("messageLabel")}
          </label>
          <ContextHelp label={t("messageHelpLabel")}>{t("messageHelp")}</ContextHelp>
        </div>
        <textarea
          id="article-message"
          rows={4}
          value={fields.message}
          onChange={(e) => update({ message: e.target.value })}
          placeholder={t("messagePlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="article-example">
          {t("exampleLabel")}
        </label>
        <textarea
          id="article-example"
          rows={2}
          value={fields.example}
          onChange={(e) => update({ example: e.target.value })}
          placeholder={t("examplePlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="article-cta">
          {t("ctaLabel")}
        </label>
        <input
          id="article-cta"
          type="text"
          value={fields.ctaHint}
          onChange={(e) => update({ ctaHint: e.target.value })}
          placeholder={t("ctaPlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
        <p className="mt-1 text-xs text-ns-secondary">{t("ctaHint")}</p>
      </div>

      {!complete && (
        <p className="text-xs text-amber-800">{t("incomplete")}</p>
      )}

      <p className="rounded-lg border border-ns-primary/20 bg-ns-brand-light/40 px-3 py-2.5 text-xs leading-relaxed text-ns-secondary">
        {writingStyle === "personal" ? t("afterGeneratePersonal") : t("afterGenerate")}
      </p>
    </section>
  );
}

/** Brief sent to generation when optional proof fields are empty. */
export function enrichArticleTopicBriefForGeneration(brief: PostBrief): PostBrief {
  const normalized = normalizePostBrief(brief);
  if (normalized.proof.trim().length >= 8) return normalized;
  return normalizePostBrief({
    ...normalized,
    proof:
      normalized.proof.trim() ||
      "Use the author's Persona and profile for credible examples and tone.",
  });
}
