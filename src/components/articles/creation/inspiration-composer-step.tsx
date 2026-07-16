"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/contexts/subscription-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { WizardStepActions, WizardStepCard } from "@/components/articles/creation/wizard-step-card";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { getClientAuth } from "@/lib/firebase/client";
import { appendInspirationReferenceBlock } from "@/lib/inspiration/append-reference-block";
import { buildReferenceTextFromLibrarySource } from "@/lib/inspiration/wizard-context";
import { hasClientLlmAccess, llmPayloadForAccess } from "@/lib/llm/client-payload";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { getAuthorProfile } from "@/lib/workspace/author";
import { listBioDocuments } from "@/lib/workspace/bio-documents";
import { BIO_DOC_ACCEPT, BIO_DOC_MAX_MB } from "@/lib/workspace/bio-documents-utils";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
  INPUT_CLASS,
  LABEL_CLASS,
  type ContentLanguage,
  type SourceLink,
} from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_EXCERPT = 40;

type BioDocListItem = {
  id: string;
  kind: "file" | "link";
  label: string;
  textPreview?: string;
  textLength?: number;
};

type Props = {
  excerpt: string;
  onExcerptChange: (excerpt: string) => void;
  librarySources: SourceLink[];
  onContinue: () => void;
  onBack: () => void;
};

async function authHeaders(): Promise<HeadersInit | null> {
  const auth = getClientAuth();
  const token = auth ? await auth.currentUser?.getIdToken() : null;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export function InspirationComposerStep({
  excerpt,
  onExcerptChange,
  librarySources,
  onContinue,
  onBack,
}: Props) {
  const t = useTranslations("setup.articles.create");
  const tInsp = useTranslations("setup.articles.create.inspiration");
  const tArticles = useTranslations("setup.articles");
  const tBio = useTranslations("setup.author.bioDocuments");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const { access } = useSubscription();
  const { scope } = useWorkspace();
  const workspaceOwnerId = scope?.ownerId ?? user?.uid ?? "";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<BioDocListItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  const urlOk = isValidUrl(url);
  const canContinue = excerpt.trim().length >= MIN_EXCERPT;

  const loadDocuments = useCallback(async () => {
    setDocsLoading(true);
    setDocError(null);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setDocError(tBio("errors.notAuthenticated"));
        return;
      }
      const res = await fetch("/api/author/bio-documents", { headers });
      const data = (await res.json()) as { documents?: BioDocListItem[]; error?: string };
      if (!res.ok) {
        setDocError(tBio("errors.loadFailed"));
        return;
      }
      setDocuments((data.documents ?? []).filter((d) => (d.textLength ?? 0) > 0));
    } catch {
      setDocError(tBio("errors.loadFailed"));
    } finally {
      setDocsLoading(false);
    }
  }, [tBio]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments, scope?.accountId]);

  function appendBlock(label: string, body: string) {
    const next = appendInspirationReferenceBlock(excerpt, label, body);
    onExcerptChange(next);
    setToolError(null);
  }

  async function onFetchUrl() {
    if (!user || !urlOk) return;
    setFetchingUrl(true);
    setUrlError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(user.uid);
      const llmPayload = llmPayloadForAccess(llmProfile, access);
      if (!token || !hasClientLlmAccess(access, llmPayload)) {
        setUrlError(tArticles("noLlmKey"));
        return;
      }

      const author = await getAuthorProfile(user.uid);
      const lang = author?.contentLanguage ?? locale;

      const res = await fetch("/api/inspiration/fetch-url", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          contentLanguage: lang,
          llm: llmPayload,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        excerpt?: string;
        title?: string;
        detail?: string;
      };

      if (!res.ok) {
        if (data.error === "no_content") {
          setUrlError(tInsp("fetchNoContent"));
          return;
        }
        if (data.error === "url_invalid" || data.error === "url_blocked") {
          setUrlError(tInsp("urlInvalid"));
          return;
        }
        if (data.error === "no_llm_key") {
          setUrlError(tArticles("noLlmKey"));
          return;
        }
        if (data.error === "invalid_api_key" || isInvalidApiKeyError(data.detail ?? "")) {
          setUrlError(tArticles("invalidApiKey"));
          return;
        }
        setUrlError(tInsp("fetchFailed"));
        return;
      }

      const body = data.excerpt?.trim();
      if (!body) {
        setUrlError(tInsp("fetchNoContent"));
        return;
      }
      const title = data.title?.trim();
      const label = title
        ? t("composer.sourceUrlTitled", { title, url: url.trim() })
        : t("composer.sourceUrl", { url: url.trim() });
      appendBlock(label, body);
    } catch {
      setUrlError(tInsp("fetchFailed"));
    } finally {
      setFetchingUrl(false);
    }
  }

  async function onUploadDocument(file: File) {
    setUploading(true);
    setDocError(null);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setDocError(tBio("errors.notAuthenticated"));
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
        setDocError(tBio("errors.uploadFailed"));
        return;
      }
      await loadDocuments();
      await onAddDocument(data.document);
    } catch {
      setDocError(tBio("errors.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function onAddDocument(doc: BioDocListItem) {
    if (!workspaceOwnerId) return;
    let body = doc.textPreview?.trim() ?? "";
    try {
      const all = await listBioDocuments(workspaceOwnerId);
      const full = all.find((item) => item.id === doc.id);
      if (full?.extractedText?.trim()) body = full.extractedText.trim();
    } catch {
      /* keep preview */
    }
    if (body.trim().length < 10) {
      setToolError(t("composer.documentEmptyText"));
      return;
    }
    appendBlock(t("composer.sourceDocument", { label: doc.label }), body);
  }

  function onAddLibrary(source: SourceLink) {
    const body = buildReferenceTextFromLibrarySource(source);
    appendBlock(
      t("composer.sourceLibrary", { label: source.label || source.url }),
      body,
    );
  }

  return (
    <WizardStepCard
      title={t("pasteTitle")}
      hint={t("composer.hint")}
      onBack={onBack}
    >
      <div className="space-y-5">
        <p className="text-sm text-ns-secondary">{t("composer.intro")}</p>

        <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-900">
            {t("composer.urlSection")}
          </p>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError(null);
            }}
            placeholder={tInsp("urlPlaceholder")}
            className={INPUT_CLASS}
          />
          <button
            type="button"
            disabled={!urlOk || fetchingUrl}
            onClick={() => void onFetchUrl()}
            className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
          >
            {fetchingUrl ? tInsp("fetching") : t("composer.addUrl")}
          </button>
          {urlError ? <p className="text-xs text-amber-800">{urlError}</p> : null}
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
            {t("composer.documentSection")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className={`${BTN_SECONDARY} !text-xs disabled:opacity-50`}
            >
              {uploading ? tBio("uploading") : tInsp("documentUpload")}
            </button>
            <span className="text-xs text-ns-secondary">
              {tInsp("documentFormats", { maxMb: BIO_DOC_MAX_MB })}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={BIO_DOC_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUploadDocument(file);
                e.target.value = "";
              }}
            />
          </div>
          {docError ? <p className="text-xs text-amber-800">{docError}</p> : null}
          {docsLoading ? (
            <p className="text-xs text-ns-secondary">{tBio("loading")}</p>
          ) : documents.length > 0 ? (
            <ul className="grid max-h-40 gap-1.5 overflow-y-auto">
              {documents.slice(0, 8).map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => void onAddDocument(doc)}
                    className="w-full rounded-lg border border-white/80 bg-white px-3 py-2 text-left text-xs hover:border-emerald-300"
                  >
                    <span className="font-semibold text-ns-tertiary">{doc.label}</span>
                    <span className="mt-0.5 block line-clamp-1 text-ns-secondary">
                      {doc.textPreview?.trim() || tInsp("documentNoPreview")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ns-secondary">{tInsp("documentEmpty")}</p>
          )}
        </div>

        {librarySources.length > 0 ? (
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-900">
              {t("composer.librarySection")}
            </p>
            <ul className="grid max-h-40 gap-1.5 overflow-y-auto">
              {librarySources.slice(0, 10).map((source) => (
                <li key={source.id}>
                  <button
                    type="button"
                    onClick={() => onAddLibrary(source)}
                    className="w-full rounded-lg border border-white/80 bg-white px-3 py-2 text-left text-xs hover:border-sky-300"
                  >
                    <span className="font-semibold text-ns-tertiary">
                      {source.label || source.url}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-ns-secondary">
                      {source.url}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <label className={LABEL_CLASS} htmlFor="inspiration-composer">
            {t("pasteLabel")}
          </label>
          <p className="mt-1 text-xs text-ns-secondary">{t("composer.combinedHelp")}</p>
          <ImeSafeTextarea
            id="inspiration-composer"
            rows={12}
            value={excerpt}
            onValueChange={onExcerptChange}
            placeholder={t("composer.combinedPlaceholder")}
            className={`${INPUT_CLASS} mt-2 font-mono text-sm`}
            lang={locale}
          />
          <p className="mt-1 text-xs text-ns-secondary">
            {tInsp("excerptHelp")} · {excerpt.trim().length}{" "}
            {t("composer.chars")}
          </p>
        </div>

        {toolError ? <p className="text-xs text-amber-800">{toolError}</p> : null}

        <WizardStepActions onBack={onBack}>
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {tInsp("continueToBrief")}
          </button>
        </WizardStepActions>
      </div>
    </WizardStepCard>
  );
}
