"use client";

import { getClientAuth } from "@/lib/firebase/client";
import { BIO_DOC_ACCEPT, BIO_DOC_MAX_MB } from "@/lib/workspace/bio-documents-utils";
import { useWorkspace } from "@/contexts/workspace-context";
import { OptionalLabel } from "@/components/setup/optional-label";
import { INPUT_CLASS } from "@/types/workspace";
import { ImeSafeInput } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type BioDocListItem = {
  id: string;
  kind: "file" | "link";
  label: string;
  mimeType?: string;
  sizeBytes?: number;
  sourceUrl?: string;
  textPreview?: string;
  textLength?: number;
  createdAt?: string;
  updatedAt?: string;
};

type Props = { userId: string };

async function authHeaders(): Promise<HeadersInit | null> {
  const auth = getClientAuth();
  const token = auth ? await auth.currentUser?.getIdToken() : null;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export function AuthorBioDocumentsPanel({ userId }: Props) {
  const t = useTranslations("setup.author.bioDocuments");
  const { scope } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<BioDocListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError(t("errors.notAuthenticated"));
        return;
      }
      const res = await fetch("/api/author/bio-documents", { headers });
      const data = (await res.json()) as { documents?: BioDocListItem[]; error?: string };
      if (!res.ok) {
        setError(t(`errors.${data.error ?? "loadFailed"}` as Parameters<typeof t>[0]));
        return;
      }
      setDocuments(data.documents ?? []);
    } catch {
      setError(t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load, scope?.accountId, userId]);

  function mapUploadError(code: string): string {
    const key = `errors.${code}` as Parameters<typeof t>[0];
    const translated = t(key);
    if (translated === key) return t("errors.uploadFailed");
    return translated;
  }

  async function onUploadFile(file: File) {
    if (uploading) return;
    setError(null);
    if (file.size > BIO_DOC_MAX_MB * 1024 * 1024) {
      setError(t("errors.file_too_large"));
      return;
    }
    setUploading(true);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError(t("errors.notAuthenticated"));
        return;
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/author/bio-documents", {
        method: "POST",
        headers,
        body: form,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(mapUploadError(data.error ?? "upload_failed"));
        return;
      }
      await load();
    } catch {
      setError(t("errors.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onAddLink() {
    if (uploading || !linkUrl.trim()) return;
    setError(null);
    setUploading(true);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError(t("errors.notAuthenticated"));
        return;
      }
      const form = new FormData();
      form.append("linkUrl", linkUrl.trim());
      if (linkLabel.trim()) form.append("linkLabel", linkLabel.trim());
      const res = await fetch("/api/author/bio-documents", {
        method: "POST",
        headers,
        body: form,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(mapUploadError(data.error ?? "upload_failed"));
        return;
      }
      setLinkUrl("");
      setLinkLabel("");
      setShowLinkForm(false);
      await load();
    } catch {
      setError(t("errors.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function onRemove(id: string) {
    if (removingId) return;
    setError(null);
    setRemovingId(id);
    const previous = documents;
    setDocuments((current) => current.filter((d) => d.id !== id));
    try {
      const headers = await authHeaders();
      if (!headers) {
        setDocuments(previous);
        setError(t("errors.notAuthenticated"));
        return;
      }
      const res = await fetch("/api/author/bio-documents", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDocuments(previous);
        setError(t(`errors.${data.error ?? "removeFailed"}` as Parameters<typeof t>[0]));
        return;
      }
    } catch {
      setDocuments(previous);
      setError(t("errors.removeFailed"));
    } finally {
      setRemovingId(null);
    }
  }

  function formatSize(bytes?: number): string | null {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-ns-brand-light/50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ns-tertiary">{t("title")}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ns-secondary">{t("description")}</p>
        <p className="mt-2 text-xs leading-relaxed text-ns-secondary/90">{t("trustNote")}</p>
      </div>

      {loading ? (
        <p className="text-sm text-ns-secondary">…</p>
      ) : documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium text-ns-tertiary">
                  {doc.kind === "link" ? t("kindLink") : t("kindFile")}
                </span>
                <span className="ml-2 text-ns-secondary">{doc.label}</span>
                {doc.sourceUrl && (
                  <a
                    href={doc.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block truncate text-ns-secondary underline"
                  >
                    {doc.sourceUrl}
                  </a>
                )}
                {doc.textLength != null && doc.textLength > 0 && (
                  <p className="mt-1 text-xs text-ns-secondary">
                    {t("extracted", { chars: doc.textLength })}
                    {formatSize(doc.sizeBytes) ? ` · ${formatSize(doc.sizeBytes)}` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={removingId === doc.id}
                onClick={() => void onRemove(doc.id)}
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

      <div className="space-y-3 border-t border-gray-100 pt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={BIO_DOC_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUploadFile(file);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-ns-tertiary hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? t("uploading") : t("uploadFile")}
        </button>
        <p className="text-xs text-ns-secondary">{t("fileHint", { maxMb: BIO_DOC_MAX_MB })}</p>

        {!showLinkForm ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => setShowLinkForm(true)}
            className="block text-sm text-ns-secondary underline hover:text-ns-tertiary disabled:opacity-50"
          >
            {t("addLink")}
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-3">
            <div>
              <OptionalLabel htmlFor="bio-doc-link" optional={false}>
                {t("linkUrl")}
              </OptionalLabel>
              <ImeSafeInput
                id="bio-doc-link"
                value={linkUrl}
                onValueChange={setLinkUrl}
                placeholder={t("linkUrlPlaceholder")}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <OptionalLabel htmlFor="bio-doc-link-label" optional>
                {t("linkLabel")}
              </OptionalLabel>
              <ImeSafeInput
                id="bio-doc-link-label"
                value={linkLabel}
                onValueChange={setLinkLabel}
                className={INPUT_CLASS}
              />
            </div>
            <p className="text-xs text-ns-secondary">{t("linkHint")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={uploading || !linkUrl.trim()}
                onClick={() => void onAddLink()}
                className="rounded-lg bg-ns-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {t("addLinkSubmit")}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setShowLinkForm(false);
                  setLinkUrl("");
                  setLinkLabel("");
                }}
                className="text-sm text-ns-secondary hover:text-ns-tertiary"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
