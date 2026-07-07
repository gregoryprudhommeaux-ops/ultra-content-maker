"use client";

import { getClientAuth } from "@/lib/firebase/client";
import { BIO_DOC_ACCEPT, BIO_DOC_MAX_MB } from "@/lib/workspace/bio-documents-utils";
import { useWorkspace } from "@/contexts/workspace-context";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type BioDocListItem = {
  id: string;
  kind: "file" | "link";
  label: string;
  textPreview?: string;
  textLength?: number;
};

type Props = {
  selectedId: string | null;
  onSelect: (doc: BioDocListItem) => void;
  onContinue: () => void;
};

async function authHeaders(): Promise<HeadersInit | null> {
  const auth = getClientAuth();
  const token = auth ? await auth.currentUser?.getIdToken() : null;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export function InspirationDocumentStep({ selectedId, onSelect, onContinue }: Props) {
  const t = useTranslations("setup.articles.create.inspiration");
  const tBio = useTranslations("setup.author.bioDocuments");
  const { scope } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<BioDocListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError(tBio("errors.notAuthenticated"));
        return;
      }
      const res = await fetch("/api/author/bio-documents", { headers });
      const data = (await res.json()) as { documents?: BioDocListItem[]; error?: string };
      if (!res.ok) {
        setError(tBio("errors.loadFailed"));
        return;
      }
      setDocuments((data.documents ?? []).filter((d) => (d.textLength ?? 0) > 0));
    } catch {
      setError(tBio("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [tBio]);

  useEffect(() => {
    void load();
  }, [load, scope?.accountId]);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError(tBio("errors.notAuthenticated"));
        return;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("label", file.name);
      const res = await fetch("/api/author/bio-documents", {
        method: "POST",
        headers,
        body: form,
      });
      const data = (await res.json()) as { document?: BioDocListItem; error?: string };
      if (!res.ok || !data.document) {
        setError(tBio("errors.uploadFailed"));
        return;
      }
      await load();
      onSelect(data.document);
    } catch {
      setError(tBio("errors.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  const selected = documents.find((d) => d.id === selectedId) ?? null;
  const canContinue = Boolean(selected && (selected.textPreview?.trim().length ?? 0) >= 40);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("documentTitle")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("documentSubtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-ns-primary/40 bg-ns-primary/10 px-4 py-2 text-sm font-semibold text-ns-tertiary hover:bg-ns-primary/15 disabled:opacity-50"
        >
          {uploading ? tBio("uploading") : t("documentUpload")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={BIO_DOC_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
            e.target.value = "";
          }}
        />
        <p className="self-center text-xs text-ns-secondary">
          {t("documentFormats", { maxMb: BIO_DOC_MAX_MB })}
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-ns-secondary">{tBio("loading")}</p>
      ) : documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-ns-brand-light/30 px-4 py-6 text-sm text-ns-secondary">
          {t("documentEmpty")}
        </p>
      ) : (
        <ul className="grid gap-2">
          {documents.map((doc) => {
            const active = doc.id === selectedId;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelect(doc)}
                  className={[
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-ns-primary bg-ns-primary/10 ring-2 ring-ns-primary/25"
                      : "border-gray-100 bg-white hover:border-ns-primary/40",
                  ].join(" ")}
                >
                  <p className="font-semibold text-ns-tertiary">{doc.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ns-secondary">
                    {doc.textPreview?.trim() || t("documentNoPreview")}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className={`${BTN_PRIMARY} disabled:opacity-50`}
      >
        {t("continueToBrief")}
      </button>
    </div>
  );
}
