"use client";

import type { InAppProposalTemplateLocale } from "@/lib/admin/support-proposal-inapp-template";
import type { QuoteContentLocale } from "@/lib/admin/support-quote-proposal-shared";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const LOCALES: QuoteContentLocale[] = ["fr", "en", "es"];

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export function AdminSupportQuoteTemplateDialog({ open, onClose, onSaved }: Props) {
  const t = useTranslations("adminCommercialProposals.templates");
  const { user } = useAuth();
  const [template, setTemplate] = useState<InAppProposalTemplateLocale | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [previewLocale, setPreviewLocale] = useState<QuoteContentLocale>("fr");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isDirty =
    template != null &&
    savedSnapshot !== JSON.stringify({ subject: template.subject, body: template.body });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/support-quote-templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(t("loadFailed"));
        return;
      }
      const body = (await res.json()) as {
        unified: InAppProposalTemplateLocale;
        placeholders: string[];
      };
      setTemplate(body.unified);
      setSavedSnapshot(JSON.stringify({ subject: body.unified.subject, body: body.unified.body }));
      setPlaceholders(body.placeholders ?? []);
      setPreview(null);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  function updateField(field: "subject" | "body", value: string) {
    setTemplate((prev) => (prev ? { ...prev, [field]: value } : prev));
    setMessage(null);
  }

  async function save() {
    if (!user || !template) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/support-quote-templates", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ unified: template }),
      });
      if (!res.ok) {
        setError(t("saveFailed"));
        return;
      }
      const body = (await res.json()) as { unified: InAppProposalTemplateLocale };
      setTemplate(body.unified);
      setSavedSnapshot(JSON.stringify({ subject: body.unified.subject, body: body.unified.body }));
      setMessage(t("savedOk"));
      onSaved?.();
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function resetDefaults() {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/support-quote-templates", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resetToDefaults: true }),
      });
      if (!res.ok) {
        setError(t("saveFailed"));
        return;
      }
      const body = (await res.json()) as { unified: InAppProposalTemplateLocale };
      setTemplate(body.unified);
      setSavedSnapshot(JSON.stringify({ subject: body.unified.subject, body: body.unified.body }));
      setMessage(t("resetOk"));
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function runPreview() {
    if (!user || !template) return;
    setPending(true);
    setError(null);
    setPreview(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/support-quote-templates", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ previewLocale, unified: template }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        preview?: { subject: string; body: string };
      };
      if (!res.ok) {
        setError(t("previewFailed"));
        return;
      }
      if (body.preview) {
        setPreview(`Objet: ${body.preview.subject}\n\n${body.preview.body}`);
      }
    } catch {
      setError(t("previewFailed"));
    } finally {
      setPending(false);
    }
  }

  function handleClose() {
    if (isDirty && !window.confirm(t("unsavedConfirm"))) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-ns-border bg-white shadow-xl"
        role="dialog"
        aria-labelledby="template-dialog-title"
      >
        <div className="shrink-0 border-b border-ns-border p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="template-dialog-title" className="text-lg font-bold text-ns-tertiary">
                {t("title")}
              </h3>
              <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
              <p className="mt-2 text-xs font-medium text-ns-primary">{t("unifiedHint")}</p>
            </div>
            <button
              type="button"
              className="text-sm font-semibold text-ns-secondary hover:text-ns-hero"
              onClick={handleClose}
            >
              {t("close")}
            </button>
          </div>

          {loading ? <p className="mt-4 text-sm text-ns-secondary">{t("loading")}</p> : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}
          {isDirty ? (
            <p className="mt-2 text-xs font-semibold text-amber-800">{t("unsaved")}</p>
          ) : null}
        </div>

        {!loading && template ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 pt-4">
              <p className="rounded-lg bg-ns-background px-3 py-2 text-xs text-ns-secondary">
                {t("placeholdersHint")}{" "}
                <code className="font-mono">{placeholders.join(", ")}</code>
              </p>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ns-tertiary">{t("subject")}</span>
                <input
                  className={INPUT_CLASS}
                  value={template.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ns-tertiary">{t("body")}</span>
                <textarea
                  className={`${INPUT_CLASS} font-mono text-xs leading-relaxed`}
                  rows={14}
                  value={template.body}
                  onChange={(e) => updateField("body", e.target.value)}
                />
              </label>

              <div className="rounded-xl border border-ns-border/80 bg-ns-brand-light/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-ns-primary">
                  {t("previewLocale")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LOCALES.map((locale) => (
                    <button
                      key={locale}
                      type="button"
                      onClick={() => setPreviewLocale(locale)}
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        previewLocale === locale
                          ? "bg-ns-tertiary text-white"
                          : "border border-ns-border bg-white text-ns-secondary"
                      }`}
                    >
                      {t(`locales.${locale}`)}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${BTN_SECONDARY} !px-3 !py-1 text-xs`}
                    disabled={pending}
                    onClick={() => void runPreview()}
                  >
                    {t("preview")}
                  </button>
                </div>
                {preview ? (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-ns-border bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap text-ns-secondary">
                    {preview}
                  </pre>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ns-border bg-ns-background/80 p-4">
              <button
                type="button"
                className={BTN_SECONDARY}
                disabled={pending}
                onClick={() => void resetDefaults()}
              >
                {t("resetDefaults")}
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={BTN_SECONDARY} onClick={handleClose}>
                  {t("close")}
                </button>
                <button
                  type="button"
                  className={BTN_PRIMARY}
                  disabled={pending || !isDirty}
                  onClick={() => void save()}
                >
                  {pending ? t("saving") : t("save")}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
