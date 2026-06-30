"use client";

import {
  isArticleTopicBriefComplete,
} from "@/lib/prompts/post-brief";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import type { PostBrief } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ContextHelp } from "@/components/ui/context-help";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

const CTA_PREFIX = "CTA / closing intention: ";

type ParsedTopicBrief = {
  topic: string;
  message: string;
  example: string;
  ctaHint: string;
};

function parseTopicBrief(brief: PostBrief): ParsedTopicBrief {
  const normalized = normalizePostBrief(brief);
  let example = normalized.proof.trim();
  let ctaHint = "";

  const ctaIndex = example.indexOf(CTA_PREFIX);
  if (ctaIndex >= 0) {
    ctaHint = example.slice(ctaIndex + CTA_PREFIX.length).trim();
    example = example.slice(0, ctaIndex).trim();
  }

  return {
    topic: normalized.problem,
    message: normalized.pointOfView,
    example,
    ctaHint,
  };
}

function buildTopicBrief(fields: ParsedTopicBrief): PostBrief {
  const proofParts: string[] = [];
  if (fields.example.trim()) proofParts.push(fields.example.trim());
  if (fields.ctaHint.trim()) proofParts.push(`${CTA_PREFIX}${fields.ctaHint.trim()}`);

  return normalizePostBrief({
    objectives: [{ objective: "conversation", priority: 1 }],
    problem: fields.topic,
    pointOfView: fields.message,
    proof: proofParts.join("\n\n"),
  });
}

type Props = {
  brief: PostBrief;
  onChange: (brief: PostBrief) => void;
};

export function ArticleTopicBriefForm({ brief, onChange }: Props) {
  const t = useTranslations("setup.articles.create.articleTopic");
  const fields = useMemo(() => parseTopicBrief(brief), [brief]);
  const complete = isArticleTopicBriefComplete(brief);

  function update(patch: Partial<ParsedTopicBrief>) {
    onChange(buildTopicBrief({ ...fields, ...patch }));
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 md:p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
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
        {t("afterGenerate")}
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
