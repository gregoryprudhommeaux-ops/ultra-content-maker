"use client";

import {
  listPersonaHistory,
} from "@/lib/workspace/persona-history";
import { restorePersonaFromHistory } from "@/lib/workspace/persona";
import type { PersonaHistoryEntry, PersonaStatus } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  userId: string;
  currentPromptText: string;
  onRestored: (promptText: string, status: PersonaStatus) => void;
};

function previewText(text: string, max = 140) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

export function PersonaHistoryPanel({
  userId,
  currentPromptText,
  onRestored,
}: Props) {
  const t = useTranslations("setup.persona.history");
  const locale = useLocale();
  const [entries, setEntries] = useState<PersonaHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listPersonaHistory(userId));
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load, currentPromptText]);

  async function onRestore(entry: PersonaHistoryEntry) {
    if (
      !window.confirm(
        t("restoreConfirm", {
          date: formatDate(entry.createdAt, locale),
        }),
      )
    ) {
      return;
    }
    setPendingId(entry.id);
    setError(null);
    try {
      const restored = await restorePersonaFromHistory(userId, entry.id);
      if (!restored) {
        setError(t("restoreFailed"));
        return;
      }
      onRestored(restored.promptText, restored.status);
      await load();
    } catch {
      setError(t("restoreFailed"));
    } finally {
      setPendingId(null);
    }
  }

  const isCurrentVersion = (entry: PersonaHistoryEntry) =>
    entry.promptText.trim() === currentPromptText.trim();

  return (
    <section className="rounded-xl border border-gray-100 bg-ns-brand-light/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-semibold text-ns-tertiary">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-ns-secondary">{t("subtitle")}</p>
        </div>
        <span className="shrink-0 text-ns-secondary" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-2">
          {loading ? (
            <p className="text-sm text-ns-secondary">…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-ns-secondary">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => {
                const expanded = expandedId === entry.id;
                const isCurrent = isCurrentVersion(entry);
                return (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <time
                            dateTime={entry.createdAt.toISOString()}
                            className="font-medium text-ns-tertiary"
                          >
                            {formatDate(entry.createdAt, locale)}
                          </time>
                          <span className="rounded-full bg-ns-brand-light px-2 py-0.5 text-xs text-ns-secondary">
                            {t(`reason.${entry.reason}`)}
                          </span>
                          <span className="text-xs text-ns-secondary">
                            {t(`status.${entry.status}`)}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-medium text-ns-primary">
                              {t("current")}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-ns-secondary">
                          {previewText(entry.promptText)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : entry.id)
                          }
                          className="text-xs font-medium text-ns-tertiary underline"
                        >
                          {expanded ? t("hide") : t("view")}
                        </button>
                        <button
                          type="button"
                          disabled={pendingId !== null || isCurrent}
                          onClick={() => onRestore(entry)}
                          className="rounded-md border border-ns-alternate px-2 py-1 text-xs font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-40"
                        >
                          {pendingId === entry.id ? t("restoring") : t("restore")}
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-ns-brand-light/80 p-2 font-mono text-xs text-ns-tertiary">
                        {entry.promptText}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
