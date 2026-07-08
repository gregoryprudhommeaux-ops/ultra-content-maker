"use client";

import { createDraftReviewLink } from "@/lib/draft-review/create-review-link-client";
import {
  readStoredReviewUrl,
  writeStoredReviewUrl,
} from "@/lib/draft-review/review-link-storage";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  articleId: string;
};

export function ArticleDraftReviewLinkButton({ articleId }: Props) {
  const t = useTranslations("adminDraftReview");
  const locale = useLocale();
  const { scope } = useWorkspace();
  const isPlatformAdmin = usePlatformAdmin();
  const [status, setStatus] = useState<"idle" | "loading" | "copied" | "error">("idle");
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredReviewUrl(articleId);
    if (stored) setReviewUrl(stored);
  }, [articleId]);

  if (!isPlatformAdmin || !scope) return null;

  async function onCreateLink() {
    if (!scope) return;
    setStatus("loading");
    try {
      const result = await createDraftReviewLink({
        articleId,
        ownerId: scope.ownerId,
        accountId: scope.accountId,
        locale,
      });
      if (!result.ok) throw new Error(result.error);
      setReviewUrl(result.url);
      writeStoredReviewUrl(articleId, result.url);
      await navigator.clipboard.writeText(result.url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void onCreateLink()}
        disabled={status === "loading"}
        className={`${BTN_SECONDARY} text-xs disabled:opacity-50`}
      >
        {status === "copied"
          ? t("copied")
          : status === "error"
            ? t("error")
            : status === "loading"
              ? t("loading")
              : t("button")}
      </button>
      {reviewUrl ? (
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-ns-primary underline"
        >
          {t("open")}
        </a>
      ) : null}
    </div>
  );
}
