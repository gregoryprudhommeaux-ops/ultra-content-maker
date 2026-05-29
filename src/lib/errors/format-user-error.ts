import { extractProviderErrorMessage } from "@/lib/llm/provider-errors";
import { truncateApiDetail } from "@/lib/llm/format-api-error";
import { getErrorMessageKey } from "@/lib/errors/error-message-key";

export type UserErrorInfo = {
  message: string;
  hint?: string;
  technical?: string;
  errorCode?: string;
  detail?: string;
};

type TranslateFn = (key: string, values?: Record<string, string>) => string;

export function formatUserError(
  t: TranslateFn,
  input: {
    errorCode?: string;
    detail?: string;
    fallbackMessage?: string;
  },
): UserErrorInfo {
  const errorCode = input.errorCode?.trim();
  const rawDetail = input.detail?.trim() ?? "";
  const messageKey = getErrorMessageKey(errorCode, rawDetail);
  const providerLine = rawDetail ? extractProviderErrorMessage(rawDetail) : "";
  const technical =
    providerLine && providerLine !== rawDetail
      ? truncateApiDetail(providerLine, 320)
      : rawDetail
        ? truncateApiDetail(rawDetail, 320)
        : undefined;

  let message: string;
  try {
    message = t(messageKey);
  } catch {
    message = input.fallbackMessage ?? t("codes.generic");
  }

  if (message === messageKey || message.startsWith("errors.")) {
    message = input.fallbackMessage ?? t("codes.generic");
  }

  const HINT_KEYS: Record<string, string> = {
    linkedin_requires_perplexity: "hints.linkedin_requires_perplexity",
    linkedin_fetch_unavailable: "hints.linkedin_fetch_unavailable",
  };
  let hint: string | undefined;
  const hintKey = errorCode ? HINT_KEYS[errorCode] : undefined;
  if (hintKey) {
    try {
      const h = t(hintKey);
      if (h !== hintKey) hint = h;
    } catch {
      /* optional */
    }
  }

  return { message, hint, technical, errorCode, detail: rawDetail || undefined };
}
