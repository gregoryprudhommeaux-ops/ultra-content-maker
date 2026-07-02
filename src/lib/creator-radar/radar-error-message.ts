import { tierForbiddenUserApiKey } from "@/lib/subscription/constants";
import type { SubscriptionTier } from "@/types/subscription";
import type { useTranslations } from "next-intl";

export const CREATOR_RADAR_ERROR_CODES = [
  "load_failed",
  "keep_failed",
  "no_llm_key",
  "own_llm_required",
  "platform_llm_unavailable",
  "subscription_expired",
  "llm_request_failed",
  "invalid_api_key",
  "insufficient_credits",
  "rate_limit",
  "no_llm_results",
  "no_valid_creators",
  "no_creators_found",
  "needs_persona",
  "needs_niche",
] as const;

export type CreatorRadarErrorCode = (typeof CREATOR_RADAR_ERROR_CODES)[number];

export type CreatorRadarErrorAction = {
  href: string;
  label: string;
};

export type CreatorRadarErrorDisplay = {
  code: CreatorRadarErrorCode;
  title: string;
  body: string;
  tips: string[];
  actions: CreatorRadarErrorAction[];
  showRetry: boolean;
};

const RETRY_CODES = new Set<CreatorRadarErrorCode>([
  "load_failed",
  "llm_request_failed",
  "rate_limit",
  "no_llm_results",
  "no_valid_creators",
  "no_creators_found",
]);

function errorActions(
  t: ReturnType<typeof useTranslations<"setup.articles.creatorRadar">>,
  code: CreatorRadarErrorCode,
  opts?: { platformOnly?: boolean },
): CreatorRadarErrorAction[] {
  const actions: CreatorRadarErrorAction[] = [];

  if (
    code === "needs_persona" ||
    code === "needs_niche" ||
    code === "no_creators_found" ||
    code === "no_llm_results" ||
    code === "load_failed"
  ) {
    actions.push({
      href: "/setup/author?tab=audience",
      label: t("errorActions.completeNiche"),
    });
    actions.push({
      href: "/setup/author?tab=inspirations",
      label: t("errorActions.addInspiration"),
    });
  }

  if (code === "needs_persona") {
    actions.unshift({
      href: "/setup/persona",
      label: t("errorActions.openPersona"),
    });
  }

  if (
    code === "no_llm_key" ||
    code === "own_llm_required" ||
    code === "invalid_api_key" ||
    (code === "platform_llm_unavailable" && !opts?.platformOnly)
  ) {
    actions.push({
      href: "/setup/llm",
      label: t("errorActions.openLlm"),
    });
  }

  if (code === "subscription_expired") {
    actions.push({
      href: "/pricing",
      label: t("errorActions.viewPricing"),
    });
  }

  return actions;
}

export function isCreatorRadarErrorCode(code: string): code is CreatorRadarErrorCode {
  return (CREATOR_RADAR_ERROR_CODES as readonly string[]).includes(code);
}

export function getCreatorRadarErrorDisplay(
  t: ReturnType<typeof useTranslations<"setup.articles.creatorRadar">>,
  code: string,
  opts?: { tier?: SubscriptionTier },
): CreatorRadarErrorDisplay {
  const resolved: CreatorRadarErrorCode = isCreatorRadarErrorCode(code)
    ? code
    : "load_failed";

  const platformOnly =
    resolved === "platform_llm_unavailable" &&
    Boolean(opts?.tier && tierForbiddenUserApiKey(opts.tier));

  const tipsKey = platformOnly
    ? `errors.${resolved}.tipsPlatformOnly`
    : `errors.${resolved}.tips`;
  const tipsRaw = t.raw(tipsKey);
  const tips = Array.isArray(tipsRaw)
    ? tipsRaw.filter((tip): tip is string => typeof tip === "string")
    : [];

  return {
    code: resolved,
    title: t(`errors.${resolved}.title`),
    body: t(`errors.${resolved}.body`),
    tips,
    actions: errorActions(t, resolved, { platformOnly }),
    showRetry: RETRY_CODES.has(resolved),
  };
}

/** @deprecated use getCreatorRadarErrorDisplay */
export function translateCreatorRadarError(
  t: ReturnType<typeof useTranslations<"setup.articles.creatorRadar">>,
  code: string,
): string {
  return getCreatorRadarErrorDisplay(t, code).body;
}
