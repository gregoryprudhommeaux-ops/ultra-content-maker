"use client";

import { OptionalLabel } from "@/components/setup/optional-label";
import {
  MAX_LINKEDIN_ACTIVITY_SOURCES,
  MAX_WEB_SOURCES,
  normalizeAuthorReferenceUrlForSave,
  validateAuthorReferenceUrl,
} from "@/lib/profile/author-reference-urls";
import { INPUT_CLASS } from "@/types/workspace";
import type { AuthorReferenceUrl, AuthorReferenceUrlKind } from "@/types/workspace";
import { ImeSafeInput } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Variant = "linkedin_activity" | "web";

type Props = {
  variant: Variant;
  items: AuthorReferenceUrl[];
  onChange: (items: AuthorReferenceUrl[]) => void;
  optional?: boolean;
};

const LINKEDIN_KINDS: AuthorReferenceUrlKind[] = ["linkedin_personal", "linkedin_company"];
/** Web URLs are stored with a neutral kind; the UI does not ask users to categorize them. */
const IMPLICIT_WEB_KIND: AuthorReferenceUrlKind = "other";

export function AuthorReferenceUrlsEditor({
  variant,
  items,
  onChange,
  optional = true,
}: Props) {
  const t = useTranslations(
    variant === "linkedin_activity"
      ? "setup.author.referenceUrls.linkedinActivity"
      : "setup.author.referenceUrls.web",
  );
  const tCommon = useTranslations("setup.author.referenceUrls");

  const maxItems =
    variant === "linkedin_activity" ? MAX_LINKEDIN_ACTIVITY_SOURCES : MAX_WEB_SOURCES;
  const isLinkedIn = variant === "linkedin_activity";

  const [kind, setKind] = useState<AuthorReferenceUrlKind>(LINKEDIN_KINDS[0]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resolveKind(): AuthorReferenceUrlKind {
    return isLinkedIn ? kind : IMPLICIT_WEB_KIND;
  }

  function onAdd() {
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) return;

    const entryKind = resolveKind();
    const validation = validateAuthorReferenceUrl(entryKind, trimmed);
    if (validation === "invalid") {
      setError(tCommon("errors.invalidUrl"));
      return;
    }
    if (validation === "not_activity") {
      setError(tCommon("errors.notActivityUrl"));
      return;
    }
    const normalizedUrl = normalizeAuthorReferenceUrlForSave(entryKind, trimmed);
    if (items.length >= maxItems) {
      setError(tCommon("errors.maxReached", { max: maxItems }));
      return;
    }
    if (
      items.some(
        (item) =>
          item.url.trim().toLowerCase() === normalizedUrl.trim().toLowerCase(),
      )
    ) {
      setError(tCommon("errors.duplicate"));
      return;
    }

    onChange([
      ...items,
      {
        url: normalizedUrl,
        kind: entryKind,
        ...(label.trim() ? { label: label.trim() } : {}),
      },
    ]);
    setUrl("");
    setLabel("");
  }

  function onRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-ns-tertiary">{t("title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-ns-secondary">{t("hint")}</p>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item.url}-${index}`}
              className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                {isLinkedIn ? (
                  <span className="font-medium text-ns-tertiary">
                    {tCommon(`kinds.${item.kind}`)}
                  </span>
                ) : null}
                {item.label ? (
                  <span
                    className={
                      isLinkedIn
                        ? "ml-2 text-ns-secondary"
                        : "font-medium text-ns-tertiary"
                    }
                  >
                    {isLinkedIn ? `· ${item.label}` : item.label}
                  </span>
                ) : null}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-ns-secondary underline"
                >
                  {item.url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="shrink-0 text-xs font-medium text-red-700 underline"
              >
                {tCommon("remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ns-secondary">{t("empty")}</p>
      )}

      {items.length < maxItems ? (
        <div className="space-y-2 rounded-lg border border-dashed border-gray-200 bg-white/80 p-3">
          {isLinkedIn ? (
            <div>
              <label className="text-xs font-medium text-ns-secondary" htmlFor={`ref-kind-${variant}`}>
                {tCommon("kindLabel")}
              </label>
              <select
                id={`ref-kind-${variant}`}
                value={kind}
                onChange={(e) => setKind(e.target.value as AuthorReferenceUrlKind)}
                className={`${INPUT_CLASS} mt-1`}
              >
                {LINKEDIN_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {tCommon(`kinds.${k}`)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="text-xs font-medium text-ns-secondary" htmlFor={`ref-url-${variant}`}>
              {tCommon("urlLabel")}
            </label>
            <ImeSafeInput
              id={`ref-url-${variant}`}
              value={url}
              onValueChange={setUrl}
              placeholder={t("urlPlaceholder")}
              className={`${INPUT_CLASS} mt-1`}
            />
          </div>
          <div>
            <OptionalLabel htmlFor={`ref-label-${variant}`} optional>
              {tCommon("labelOptional")}
            </OptionalLabel>
            <ImeSafeInput
              id={`ref-label-${variant}`}
              value={label}
              onValueChange={setLabel}
              placeholder={tCommon("labelPlaceholder")}
              className={`${INPUT_CLASS} mt-1`}
            />
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="text-sm font-medium text-ns-tertiary underline hover:text-ns-primary"
          >
            {tCommon("add")}
          </button>
        </div>
      ) : (
        <p className="text-xs text-ns-secondary">{tCommon("maxReached", { max: maxItems })}</p>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
