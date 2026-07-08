import { getClientAuth } from "@/lib/firebase/client";

export type CreateReviewLinkInput = {
  articleId: string;
  ownerId: string;
  accountId: string;
  locale: string;
};

export type CreateReviewLinkResult =
  | { ok: true; url: string; token: string; expiresAt: string }
  | { ok: false; error: string; detail?: string };

export async function createDraftReviewLink(
  input: CreateReviewLinkInput,
): Promise<CreateReviewLinkResult> {
  const auth = getClientAuth();
  const token = await auth?.currentUser?.getIdToken();
  if (!token) return { ok: false, error: "auth" };

  const res = await fetch(
    `/api/admin/articles/${encodeURIComponent(input.articleId)}/draft-review-link`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ownerId: input.ownerId,
        accountId: input.accountId,
        locale: input.locale,
      }),
    },
  );

  const data = (await res.json()) as {
    url?: string;
    token?: string;
    expiresAt?: string;
    error?: string;
    detail?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? "api",
      detail: data.detail,
    };
  }

  if (!data.url?.trim()) {
    return { ok: false, error: "missing_url" };
  }

  return {
    ok: true,
    url: data.url.trim(),
    token: data.token ?? "",
    expiresAt: data.expiresAt ?? "",
  };
}
