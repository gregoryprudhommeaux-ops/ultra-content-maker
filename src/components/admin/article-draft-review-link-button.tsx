"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  articleId: string;
};

export function ArticleDraftReviewLinkButton({ articleId }: Props) {
  const t = useTranslations("adminDraftReview");
  const locale = useLocale();
  const { user } = useAuth();
  const { scope } = useWorkspace();
  const isPlatformAdmin = usePlatformAdmin();
  const [status, setStatus] = useState<"idle" | "loading" | "copied" | "error">("idle");

  if (!isPlatformAdmin || !user) return null;

  async function onCreateLink() {
    if (!scope) return;
    setStatus("loading");
    try {
      const auth = getClientAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error("auth");

      const res = await fetch(`/api/admin/articles/${encodeURIComponent(articleId)}/draft-review-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: scope.ownerId,
          accountId: scope.accountId,
          locale,
        }),
      });
      if (!res.ok) throw new Error("api");
      const data = (await res.json()) as { url: string };
      await navigator.clipboard.writeText(data.url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
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
  );
}
