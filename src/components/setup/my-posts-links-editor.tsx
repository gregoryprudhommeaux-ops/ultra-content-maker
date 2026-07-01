"use client";

import { addSource, listSourcesByCategory, removeSource } from "@/lib/workspace/sources";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import type { SourceLink, SourceType } from "@/types/workspace";
import { OptionalLabel } from "@/components/setup/optional-label";
import { useWorkspace } from "@/contexts/workspace-context";
import { INPUT_CLASS } from "@/types/workspace";
import { ImeSafeInput } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const MY_POST_TYPES: SourceType[] = ["linkedin_post", "blog", "website", "other"];

type Props = { userId: string };

export function MyPostsLinksEditor({ userId }: Props) {
  const t = useTranslations("setup.author.sources");
  const { scope } = useWorkspace();
  const [sources, setSources] = useState<SourceLink[]>([]);
  const [type, setType] = useState<SourceType>("linkedin_post");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(
    async (fromServer = false) => {
      setLoading(true);
      try {
        setSources(await listSourcesByCategory(userId, "my_post", { fromServer }));
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load();
  }, [load, scope?.accountId]);

  async function onAdd() {
    setError(null);
    if (!url.trim()) return;
    if (!isValidUrl(url.trim())) {
      setError(t("invalidUrl"));
      return;
    }
    try {
      await addSource(userId, {
        type,
        url: url.trim(),
        label: label.trim() || undefined,
        category: "my_post",
      });
      setUrl("");
      setLabel("");
      await load(true);
    } catch {
      setError(t("addFailed"));
    }
  }

  async function onRemove(id: string) {
    if (removingId) return;
    setError(null);
    setRemovingId(id);
    const previous = sources;
    setSources((current) => current.filter((s) => s.id !== id));
    try {
      await removeSource(userId, id);
      await load(true);
    } catch {
      setSources(previous);
      setError(t("removeFailed"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-ns-brand-light/50 p-4">
      <h3 className="text-sm font-semibold text-ns-tertiary">{t("title")}</h3>
      <p className="text-sm text-ns-secondary">{t("description")}</p>

      {loading ? (
        <p className="text-sm text-ns-secondary">…</p>
      ) : sources.length > 0 ? (
        <ul className="space-y-2">
          {sources.map((s) => (
            <li
              key={s.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium text-ns-tertiary">
                  {t(`types.${s.type}`)}
                </span>
                {s.label && (
                  <span className="ml-2 text-ns-secondary">{s.label}</span>
                )}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-ns-secondary underline"
                >
                  {s.url}
                </a>
              </div>
              <button
                type="button"
                disabled={removingId === s.id}
                onClick={() => void onRemove(s.id)}
                className="shrink-0 text-ns-secondary hover:text-red-600 disabled:opacity-50"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ns-secondary">{t("empty")}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <OptionalLabel htmlFor="my-source-type">{t("type")}</OptionalLabel>
          <select
            id="my-source-type"
            value={type}
            onChange={(e) => setType(e.target.value as SourceType)}
            className={INPUT_CLASS}
          >
            {MY_POST_TYPES.map((st) => (
              <option key={st} value={st}>
                {t(`types.${st}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <OptionalLabel htmlFor="my-source-url">{t("url")}</OptionalLabel>
          <input
            id="my-source-url"
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <OptionalLabel htmlFor="my-source-label">{t("labelOptional")}</OptionalLabel>
          <ImeSafeInput
            id="my-source-label"
            value={label}
            onValueChange={setLabel}
            className={INPUT_CLASS}
          />
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <button
          type="button"
          onClick={() => void onAdd()}
          className="rounded-lg border border-ns-alternate bg-white px-4 py-2 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light sm:col-span-2"
        >
          {t("add")}
        </button>
      </div>
    </div>
  );
}
