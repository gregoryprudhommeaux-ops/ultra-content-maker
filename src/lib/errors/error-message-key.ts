import { classifyLlmApiError } from "@/lib/llm/format-api-error";
import { classifyProviderErrorMessage } from "@/lib/llm/provider-errors";

const CODE_KEYS: Record<string, string> = {
  no_llm_key: "codes.noLlmKey",
  invalid_api_key: "codes.invalidApiKey",
  insufficient_credits: "codes.insufficientCredits",
  rate_limit: "codes.rateLimit",
  verify_failed: "codes.verifyFailed",
  llm_request_failed: "codes.llmRequestFailed",
  linkedin_requires_perplexity: "codes.linkedinPerplexity",
  linkedin_fetch_unavailable: "codes.linkedinFetchUnavailable",
  analysis_failed: "codes.analysisFailed",
  strategy_parse_failed: "codes.strategyParseFailed",
  not_activity_url: "codes.notActivityUrl",
  url_invalid: "codes.urlInvalid",
  fetch_failed: "codes.fetchFailed",
  no_content: "codes.noContent",
  invalid_json: "codes.invalidJson",
  empty_response: "codes.emptyResponse",
  all_filtered_by_date: "codes.newsFiltered",
  no_recent_news: "codes.noRecentNews",
  no_llm_results: "codes.noNewsResults",
  email_not_configured: "codes.emailNotConfigured",
  notify_failed: "codes.notifyFailed",
  report_failed: "codes.reportFailed",
  Unauthorized: "codes.unauthorized",
  "Invalid body": "codes.invalidBody",
};

/** next-intl key under the `errors` namespace (e.g. errors.codes.noLlmKey). */
export function getErrorMessageKey(errorCode?: string, detail?: string): string {
  const code = (errorCode ?? "").trim();
  const rawDetail = (detail ?? "").trim();

  if (rawDetail) {
    const providerKind = classifyProviderErrorMessage(rawDetail);
    if (providerKind === "insufficient_credits") return "codes.insufficientCredits";
    if (providerKind === "invalid_key") return "codes.invalidApiKey";
    if (providerKind === "rate_limit") return "codes.rateLimit";
  }

  const llm = classifyLlmApiError(code, rawDetail);
  switch (llm.kind) {
    case "no_key":
      return "codes.noLlmKey";
    case "invalid_key":
      return "codes.invalidApiKey";
    case "insufficient_credits":
      return "codes.insufficientCredits";
    case "rate_limit":
      return "codes.rateLimit";
    case "timeout":
      return "codes.timeout";
    case "invalid_json":
      return "codes.invalidJson";
    case "empty_response":
      return "codes.emptyResponse";
    default:
      break;
  }

  if (code && CODE_KEYS[code]) return CODE_KEYS[code];

  return "codes.generic";
}
