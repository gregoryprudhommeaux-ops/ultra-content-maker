"use client";

import { parsePublishedTopics } from "@/lib/persona/organization-enrichment";
import { getProfileEnrichment, saveProfileEnrichment } from "@/lib/workspace/enrichment";
import { publishedTopicsToEnrichmentPatch } from "@/lib/persona/organization-enrichment";
import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import type { PublishedTopicEntry } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  userId: string;
};

export function PublishedTopicsPanel({ userId }: Props) {
  const t = useTranslations("setup.author.publishedTopics");
  const [topics, setTopics] = useState<PublishedTopicEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const enrichment = await getProfileEnrichment(userId);
      setTopics(parsePublishedTopics(enrichment?.details));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeTopic(articleId: string) {
    setRemovingId(articleId);
    try {
      const next = topics.filter((t) => t.articleId !== articleId);
      await saveProfileEnrichment(userId, publishedTopicsToEnrichmentPatch(next));
      setTopics(next);
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-ns-secondary">…</p>;
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-ns-secondary">{t("subtitle")}</p>
      </div>
      {topics.length === 0 ? (
        <p className="text-sm text-ns-secondary">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {topics.map((topic) => (
            <li
              key={topic.articleId}
              className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-ns-tertiary">{topic.headline}</p>
                {topic.summary !== topic.headline ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-ns-secondary">{topic.summary}</p>
                ) : null}
                <p className="mt-1 text-[10px] text-ns-secondary">
                  {new Date(topic.publishedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                disabled={removingId === topic.articleId}
                onClick={() => void removeTopic(topic.articleId)}
                className="shrink-0 text-xs font-medium text-red-700 underline disabled:opacity-50"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
