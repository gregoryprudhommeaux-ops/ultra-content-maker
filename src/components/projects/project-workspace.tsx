"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { useSubscription } from "@/contexts/subscription-context";
import {
  appendContentProjectChat,
  buildProjectNewsInterestQuery,
  ideaHitFromNewsSuggestion,
  newContentProjectMessageId,
  newsSourceFromIdeaHit,
  resolveGenerateIdea,
  sortIdeasByStars,
} from "@/lib/projects/content-project";
import { getClientAuth } from "@/lib/firebase/client";
import { hasClientLlmAccess, llmPayloadForAccess, llmPayloadForTier } from "@/lib/llm/client-payload";
import { buildPostBriefFromContentProject } from "@/lib/prompts/lucy-project-chat";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import { buildDefaultSignaturePs } from "@/lib/articles/signature-ps";
import { gatherAuthorSteeringPayload } from "@/lib/profile/gather-author-steering";
import { getPersona } from "@/lib/workspace/persona";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { createArticleBatch } from "@/lib/workspace/articles";
import { notifyArticlesChangedDeferred } from "@/lib/workspace/articles-events";
import {
  getContentProject,
  listContentProjects,
  updateContentProject,
} from "@/lib/workspace/content-projects";
import { BTN_PRIMARY, INPUT_CLASS, LABEL_CLASS, META_LABEL } from "@/lib/ui/nextstep";
import type {
  ChannelOwner,
  ContentJob,
  ContentLanguage,
  ContentProject,
  ContentProjectIdeaHit,
  CtaIntensity,
  EmojiLevel,
  NewsSuggestion,
  ProductFrame,
} from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  projectId: string;
};

const LANGUAGES: ContentLanguage[] = ["fr", "en", "es"];
const CHANNELS: ChannelOwner[] = ["gregory", "la_mesa", "generic"];
const PRODUCTS: ProductFrame[] = ["la_mesa_dinners", "nextstep_market_entry", "generic"];
const JOBS: Array<ContentJob | ""> = ["", "teaser", "explain", "convert"];
const EMOJI_LEVELS: EmojiLevel[] = ["none", "light", "heavy"];
const CTA_STYLES: Array<CtaIntensity | ""> = ["", "soft", "medium", "pushy"];

export function ProjectWorkspace({ projectId }: Props) {
  const t = useTranslations("projects");
  const { user } = useAuth();
  const { access } = useSubscription();
  const { progress } = useOnboardingProgress();
  const router = useRouter();
  const [project, setProject] = useState<ContentProject | null>(null);
  const [siblings, setSiblings] = useState<ContentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBrief, setSavingBrief] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newsBusy, setNewsBusy] = useState(false);
  const [newsPreview, setNewsPreview] = useState<NewsSuggestion[]>([]);
  const [draft, setDraft] = useState("");
  const [ideaDraft, setIdeaDraft] = useState("");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const profileReadyForNews = Boolean(
    progress?.completion.hasPersonaValidated && progress?.completion.hasProfileMinimum,
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [p, all] = await Promise.all([
        getContentProject(user.uid, projectId),
        listContentProjects(user.uid),
      ]);
      setProject(p);
      setSiblings(all);
      if (!p) setError(t("notFound"));
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, projectId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project?.chat?.length]);

  useEffect(() => {
    if (!project?.ideas?.length) {
      setSelectedIdeaId(null);
      return;
    }
    setSelectedIdeaId((prev) => {
      if (prev && project.ideas.some((i) => i.id === prev)) return prev;
      return resolveGenerateIdea(project.ideas)?.id ?? null;
    });
  }, [project?.ideas]);

  async function persist(
    patch: Parameters<typeof updateContentProject>[2],
    nextLocal?: ContentProject,
  ) {
    if (!user || !project) return;
    setSavingBrief(true);
    try {
      await updateContentProject(user.uid, project.id, patch);
      if (nextLocal) setProject(nextLocal);
      else setProject((prev) => (prev ? { ...prev, ...patch, updatedAt: new Date() } : prev));
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSavingBrief(false);
    }
  }

  async function saveBrief(next: { name?: string; brief?: string; emoji?: string }) {
    if (!project) return;
    await persist(next);
  }

  async function savePrefs(patch: {
    contentLanguage?: ContentLanguage;
    channelOwner?: ChannelOwner;
    productFrame?: ProductFrame;
    contentJob?: ContentJob | null;
    emojiLevel?: EmojiLevel;
    preferredCtaStyle?: CtaIntensity | null;
    includeSignaturePs?: boolean;
    newsInterestQuery?: string;
  }) {
    if (!project) return;
    const normalized = {
      ...patch,
      contentJob: patch.contentJob === null ? undefined : patch.contentJob,
      preferredCtaStyle:
        patch.preferredCtaStyle === null ? undefined : patch.preferredCtaStyle,
    };
    await persist(normalized as Parameters<typeof updateContentProject>[2]);
  }

  async function addIdea() {
    if (!project || !ideaDraft.trim()) return;
    setError(null);
    const idea: ContentProjectIdeaHit = {
      id: newContentProjectMessageId(),
      title: ideaDraft.trim(),
      stars: 4,
      reason: t("ideaManualReason"),
      source: "manual",
    };
    const ideas = sortIdeasByStars([...(project.ideas ?? []), idea]);
    setIdeaDraft("");
    setSelectedIdeaId(idea.id);
    await persist({ ideas }, { ...project, ideas, updatedAt: new Date() });
  }

  async function addNewsAsIdea(news: NewsSuggestion) {
    if (!project) return;
    const already = (project.ideas ?? []).some(
      (i) => i.url && i.url === news.url,
    );
    if (already) {
      setError(t("newsAlreadyAdded"));
      return;
    }
    setError(null);
    const idea = ideaHitFromNewsSuggestion(news, 4);
    idea.reason = idea.reason || t("ideaNewsReason");
    const ideas = sortIdeasByStars([...(project.ideas ?? []), idea]);
    setSelectedIdeaId(idea.id);
    setNewsPreview((prev) => prev.filter((n) => n.id !== news.id));
    await persist({ ideas }, { ...project, ideas, updatedAt: new Date() });
  }

  async function setIdeaStars(ideaId: string, stars: number) {
    if (!project) return;
    const ideas = sortIdeasByStars(
      (project.ideas ?? [])
        .map((i) => (i.id === ideaId ? { ...i, stars } : i))
        .filter((i) => i.stars >= 3),
    );
    if (selectedIdeaId === ideaId && stars < 3) setSelectedIdeaId(null);
    await persist({ ideas }, { ...project, ideas, updatedAt: new Date() });
  }

  async function scanNews() {
    if (!user || !project || newsBusy) return;
    if (!profileReadyForNews) {
      setError(t("profileGate"));
      return;
    }
    setNewsBusy(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [persona, llmProfile, authorSteering] = await Promise.all([
        getPersona(user.uid),
        getUserLlmProfile(user.uid),
        gatherAuthorSteeringPayload(user.uid, {
          newsInterestQuery: buildProjectNewsInterestQuery(project),
        }),
      ]);
      const llmPayload = llmPayloadForTier(llmProfile, access?.effectiveTier);
      if (!token || !persona?.promptText?.trim() || !hasClientLlmAccess(access, llmPayload)) {
        setError(t("needLlm"));
        return;
      }

      const res = await fetch("/api/news/suggestions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaExcerpt: persona.promptText,
          contentLanguage: project.contentLanguage ?? "fr",
          authorSteering,
          newsInterestQuery: buildProjectNewsInterestQuery(project),
          llm: llmPayload,
        }),
      });
      const data = (await res.json()) as { news?: NewsSuggestion[]; error?: string };
      if (!res.ok) {
        setError(t("newsFailed"));
        setNewsPreview([]);
        return;
      }
      setNewsPreview(data.news ?? []);
      if (!(data.news?.length)) setError(t("newsEmpty"));
    } catch {
      setError(t("newsFailed"));
    } finally {
      setNewsBusy(false);
    }
  }

  async function sendMessage() {
    if (!user || !project || !draft.trim() || chatBusy) return;
    const userMessage = draft.trim();
    setDraft("");
    setChatBusy(true);
    setError(null);

    const withUser = appendContentProjectChat(project, [
      { role: "user", content: userMessage },
    ]);
    setProject(withUser);

    try {
      await updateContentProject(user.uid, project.id, { chat: withUser.chat });

      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [persona, llmProfile] = await Promise.all([
        getPersona(user.uid),
        getUserLlmProfile(user.uid),
      ]);
      const llmPayload = llmPayloadForAccess(llmProfile, access);

      if (!token || !hasClientLlmAccess(access, llmPayload)) {
        setError(t("needLlm"));
        setChatBusy(false);
        return;
      }

      const res = await fetch("/api/projects/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          project: {
            name: withUser.name,
            brief: withUser.brief,
            channelOwner: withUser.channelOwner,
            productFrame: withUser.productFrame,
            contentLanguage: withUser.contentLanguage,
            contentJob: withUser.contentJob,
          },
          ideas: withUser.ideas,
          siblings: siblings.map((s) => ({
            id: s.id,
            name: s.name,
            brief: s.brief,
          })),
          history: withUser.chat,
          userMessage,
          personaExcerpt: persona?.promptText?.slice(0, 1800),
          profileReadyForNews,
          contentLanguage: withUser.contentLanguage ?? "fr",
          llm: llmPayload,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply?.trim()) {
        setError(t("chatFailed"));
        setChatBusy(false);
        return;
      }

      const withLucy = appendContentProjectChat(withUser, [
        { role: "assistant", content: data.reply.trim() },
      ]);
      await updateContentProject(user.uid, project.id, { chat: withLucy.chat });
      setProject(withLucy);
    } catch {
      setError(t("chatFailed"));
    } finally {
      setChatBusy(false);
    }
  }

  async function generateDraft() {
    if (!user || !project || generating) return;
    if (!project.brief.trim() && !(project.ideas?.length)) {
      setError(t("briefHint"));
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const interest = buildProjectNewsInterestQuery(project);
      const [persona, llmProfile, author, authorSteering] = await Promise.all([
        getPersona(user.uid),
        getUserLlmProfile(user.uid),
        getAuthorProfile(user.uid),
        gatherAuthorSteeringPayload(user.uid, {
          newsInterestQuery: interest || undefined,
        }),
      ]);
      const llmPayload = llmPayloadForTier(llmProfile, access?.effectiveTier);
      if (!token || !hasClientLlmAccess(access, llmPayload)) {
        setError(t("needLlm"));
        return;
      }

      const contentLanguage = project.contentLanguage ?? "fr";
      const emojiLevel = project.emojiLevel ?? "light";
      const selectedIdea = resolveGenerateIdea(project.ideas, selectedIdeaId);
      const postBrief = normalizePostBrief(
        buildPostBriefFromContentProject(project, {
          selectedIdeaId: selectedIdea?.id ?? selectedIdeaId,
        }),
      );
      const newsSource = newsSourceFromIdeaHit(selectedIdea);
      const signaturePs =
        project.includeSignaturePs === true
          ? buildDefaultSignaturePs({
              contentLanguage,
              roleTitle: author?.roleTitle,
              positioningLine: author?.positioningLine,
              savedSignaturePs: author?.signaturePs,
            }).trim() || undefined
          : undefined;

      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaPromptText: persona?.promptText ?? "",
          contentLanguage,
          count: 1,
          articleCount: 1,
          emojiLevel,
          postBrief,
          targetScope: "niche",
          // Standard generate path (not creationMode:article) so publishedTopics avoidance applies.
          ...(newsSource ? { newsSource } : {}),
          authorSteering,
          newsInterestQuery: interest || undefined,
          llm: llmPayload,
        }),
      });
      const data = (await res.json()) as {
        articles?: Array<{
          hook: string;
          body: string;
          ps?: string;
          hashtags?: string[];
        }>;
        error?: string;
      };
      if (!res.ok || !data.articles?.[0]) {
        setError(t("generateFailed"));
        return;
      }

      const item = data.articles[0];
      const batchId = crypto.randomUUID();
      const ids = await createArticleBatch(
        user.uid,
        batchId,
        [
          {
            ...item,
            ps: signaturePs ?? item.ps,
            scope: "niche",
          },
        ],
        contentLanguage,
        emojiLevel,
        newsSource,
        postBrief,
        undefined,
        {
          contentProjectId: project.id,
          selectedCtaStyle: project.preferredCtaStyle,
        },
      );
      const articleId = ids[0];
      if (!articleId) {
        setError(t("generateFailed"));
        return;
      }

      const articleIds = [...(project.articleIds ?? []), articleId];
      await updateContentProject(user.uid, project.id, { articleIds });
      setProject({ ...project, articleIds, updatedAt: new Date() });
      notifyArticlesChangedDeferred();
      router.push(`/articles/${articleId}`);
    } catch {
      setError(t("generateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-ns-secondary">
        {t("loading")}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-red-800">{error ?? t("notFound")}</p>
        <Link href="/projects" className="mt-4 inline-block text-sm font-semibold underline">
          ← {t("backToHub")}
        </Link>
      </div>
    );
  }

  const ideas = sortIdeasByStars(project.ideas ?? []);
  const selectedIdeaForUi = resolveGenerateIdea(ideas, selectedIdeaId);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px] sm:px-6">
      <div className="min-w-0 space-y-4">
        <Link
          href="/projects"
          className="text-xs font-semibold uppercase tracking-wide text-ns-secondary hover:text-ns-tertiary"
        >
          ← {t("backToHub")}
        </Link>

        <div className="flex items-start gap-3">
          <ImeSafeInput
            value={project.emoji ?? "🎯"}
            onValueChange={(emoji) => setProject({ ...project, emoji })}
            onBlur={() => void saveBrief({ emoji: project.emoji })}
            className="w-14 rounded-lg border border-ns-alternate bg-white px-2 py-2 text-center text-xl"
            aria-label={t("emojiLabel")}
          />
          <div className="min-w-0 flex-1">
            <p className={META_LABEL}>{t("lucyBadge")}</p>
            <ImeSafeInput
              value={project.name}
              onValueChange={(name) => setProject({ ...project, name })}
              onBlur={() => void saveBrief({ name: project.name })}
              className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-black tracking-tight text-ns-tertiary outline-none focus:ring-0"
            />
          </div>
        </div>

        {!profileReadyForNews && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            {t("profileGate")}{" "}
            <Link href="/persona" className="font-semibold underline">
              {t("goPersona")}
            </Link>
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
            {error}
          </p>
        )}

        <div className="flex max-h-[48vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-ns-alternate/70 bg-white p-4 shadow-sm">
          {project.chat.length === 0 && (
            <p className="text-sm leading-relaxed text-ns-secondary">{t("chatEmpty")}</p>
          )}
          {project.chat.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-8 rounded-2xl bg-ns-primary/15 px-3 py-2 text-sm text-ns-tertiary"
                  : "mr-8 rounded-2xl bg-ns-surface px-3 py-2 text-sm text-ns-tertiary"
              }
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ns-secondary">
                {m.role === "user" ? t("you") : "Lucy"}
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2">
          <ImeSafeTextarea
            rows={2}
            value={draft}
            onValueChange={setDraft}
            placeholder={t("chatPlaceholder")}
            className={`${INPUT_CLASS} flex-1`}
            disabled={chatBusy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            type="button"
            disabled={chatBusy || !draft.trim()}
            onClick={() => void sendMessage()}
            className={`${BTN_PRIMARY} self-end disabled:opacity-50`}
          >
            {chatBusy ? t("sending") : t("send")}
          </button>
        </div>
        <p className="text-[10px] text-ns-secondary">{t("chatSendHint")}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!profileReadyForNews || newsBusy || chatBusy || generating}
            onClick={() => void scanNews()}
            className="rounded-lg border border-ns-alternate bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ns-tertiary hover:bg-ns-surface disabled:opacity-50"
          >
            {newsBusy ? t("newsScanning") : t("quickNews")}
          </button>
          <button
            type="button"
            disabled={generating || chatBusy || newsBusy}
            onClick={() => void generateDraft()}
            className="rounded-lg border border-ns-tertiary/30 bg-ns-tertiary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ns-tertiary hover:bg-ns-tertiary/15 disabled:opacity-50"
          >
            {t("quickGenerate")}
          </button>
        </div>

        <button
          type="button"
          disabled={generating || chatBusy || newsBusy}
          onClick={() => void generateDraft()}
          className="inline-flex w-full flex-col items-center justify-center gap-1 rounded-sm bg-ns-tertiary px-4 py-3 text-white hover:bg-ns-tertiary/90 disabled:opacity-50"
        >
          <span className="text-xs font-black uppercase tracking-widest">
            {generating ? t("generating") : t("generateDraft")}
          </span>
          {!generating && selectedIdeaForUi && (
            <span className="max-w-full truncate text-[10px] font-medium text-white/80">
              {selectedIdeaForUi.source === "news"
                ? t("generateFromNews", { title: selectedIdeaForUi.title })
                : t("generateFromIdea", { title: selectedIdeaForUi.title })}
            </span>
          )}
        </button>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-ns-alternate/70 bg-white p-4 shadow-sm">
          <label className={LABEL_CLASS}>{t("briefLabel")}</label>
          <p className="mb-2 text-xs text-ns-secondary">{t("briefHint")}</p>
          <ImeSafeTextarea
            rows={6}
            value={project.brief}
            onValueChange={(brief) => setProject({ ...project, brief })}
            onBlur={() => void saveBrief({ brief: project.brief })}
            className={INPUT_CLASS}
            placeholder={t("briefPlaceholder")}
            disabled={savingBrief}
          />
        </div>

        <div className="rounded-2xl border border-ns-alternate/70 bg-white p-4 shadow-sm space-y-3">
          <div>
            <p className={LABEL_CLASS}>{t("prefsTitle")}</p>
            <p className="text-xs text-ns-secondary">{t("prefsHint")}</p>
          </div>
          <label className="block text-xs font-semibold text-ns-tertiary">
            {t("prefLanguage")}
            <select
              className={`${INPUT_CLASS} mt-1`}
              value={project.contentLanguage ?? "fr"}
              onChange={(e) =>
                void savePrefs({ contentLanguage: e.target.value as ContentLanguage })
              }
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-ns-tertiary">
            {t("prefChannel")}
            <select
              className={`${INPUT_CLASS} mt-1`}
              value={project.channelOwner ?? "generic"}
              onChange={(e) =>
                void savePrefs({ channelOwner: e.target.value as ChannelOwner })
              }
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(`channel.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-ns-tertiary">
            {t("prefProduct")}
            <select
              className={`${INPUT_CLASS} mt-1`}
              value={project.productFrame ?? "generic"}
              onChange={(e) =>
                void savePrefs({ productFrame: e.target.value as ProductFrame })
              }
            >
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {t(`product.${p}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-ns-tertiary">
            {t("prefJob")}
            <select
              className={`${INPUT_CLASS} mt-1`}
              value={project.contentJob ?? ""}
              onChange={(e) => {
                const v = e.target.value as ContentJob | "";
                void savePrefs({ contentJob: v ? v : null });
              }}
            >
              {JOBS.map((j) => (
                <option key={j || "unset"} value={j}>
                  {j ? t(`job.${j}`) : t("job.unset")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-ns-tertiary">
            {t("prefEmoji")}
            <select
              className={`${INPUT_CLASS} mt-1`}
              value={project.emojiLevel ?? "light"}
              onChange={(e) =>
                void savePrefs({ emojiLevel: e.target.value as EmojiLevel })
              }
            >
              {EMOJI_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`emoji.${level}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-ns-tertiary">
            {t("prefCta")}
            <select
              className={`${INPUT_CLASS} mt-1`}
              value={project.preferredCtaStyle ?? ""}
              onChange={(e) => {
                const v = e.target.value as CtaIntensity | "";
                void savePrefs({ preferredCtaStyle: v ? v : null });
              }}
            >
              {CTA_STYLES.map((s) => (
                <option key={s || "unset"} value={s}>
                  {s ? t(`cta.${s}`) : t("cta.unset")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2 text-xs font-semibold text-ns-tertiary">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={project.includeSignaturePs === true}
              onChange={(e) =>
                void savePrefs({ includeSignaturePs: e.target.checked })
              }
            />
            <span>
              {t("prefSignaturePs")}
              <span className="mt-0.5 block font-normal text-ns-secondary">
                {t("prefSignaturePsHint")}
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-2xl border border-ns-alternate/70 bg-white p-4 shadow-sm space-y-3">
          <div>
            <p className={LABEL_CLASS}>{t("newsTitle")}</p>
            <p className="text-xs text-ns-secondary">{t("newsHint")}</p>
          </div>
          <label className="block text-xs font-semibold text-ns-tertiary">
            {t("newsKeywords")}
            <ImeSafeInput
              value={project.newsInterestQuery ?? ""}
              onValueChange={(newsInterestQuery) =>
                setProject({ ...project, newsInterestQuery })
              }
              onBlur={() =>
                void savePrefs({
                  newsInterestQuery: project.newsInterestQuery ?? "",
                })
              }
              placeholder={t("newsKeywordsPlaceholder")}
              className={`${INPUT_CLASS} mt-1`}
              disabled={!profileReadyForNews}
            />
          </label>
          <button
            type="button"
            disabled={!profileReadyForNews || newsBusy || chatBusy}
            onClick={() => void scanNews()}
            className="w-full rounded-lg border border-ns-alternate px-3 py-2 text-xs font-bold uppercase tracking-wide text-ns-tertiary hover:bg-ns-surface disabled:opacity-50"
          >
            {newsBusy ? t("newsScanning") : t("newsScan")}
          </button>
          {newsPreview.length > 0 && (
            <ul className="space-y-2">
              {newsPreview.slice(0, 6).map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-ns-alternate/50 bg-ns-surface/50 px-2.5 py-2"
                >
                  <p className="text-sm font-semibold text-ns-tertiary">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-ns-secondary">
                    {n.summary}
                  </p>
                  <button
                    type="button"
                    className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-ns-primary underline"
                    onClick={() => void addNewsAsIdea(n)}
                  >
                    {t("newsAddIdea")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-ns-alternate/70 bg-white p-4 shadow-sm space-y-3">
          <div>
            <p className={LABEL_CLASS}>{t("ideasTitle")}</p>
            <p className="text-xs text-ns-secondary">{t("ideasHint")}</p>
          </div>
          {ideas.length === 0 ? (
            <p className="text-xs text-ns-secondary">{t("ideasEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {ideas.map((idea) => {
                const selected = selectedIdeaId === idea.id;
                return (
                  <li
                    key={idea.id}
                    className={`rounded-lg border px-2.5 py-2 ${
                      selected
                        ? "border-ns-primary bg-ns-primary/10"
                        : "border-ns-alternate/50 bg-ns-surface/50"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedIdeaId(idea.id)}
                    >
                      <p className="text-sm font-semibold text-ns-tertiary">{idea.title}</p>
                      {idea.source === "news" && (
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                          {t("ideaFromNews")}
                        </p>
                      )}
                    </button>
                    <div className="mt-1 flex items-center gap-1">
                      {[3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`text-xs ${idea.stars >= n ? "text-amber-500" : "text-gray-300"}`}
                          onClick={() => void setIdeaStars(idea.id, n)}
                        >
                          ★
                        </button>
                      ))}
                      <button
                        type="button"
                        className="ml-auto text-[10px] text-ns-secondary underline"
                        onClick={() => void setIdeaStars(idea.id, 0)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex gap-2">
            <ImeSafeInput
              value={ideaDraft}
              onValueChange={setIdeaDraft}
              placeholder={t("ideaTitlePlaceholder")}
              className={`${INPUT_CLASS} flex-1`}
            />
            <button
              type="button"
              disabled={!ideaDraft.trim()}
              onClick={() => void addIdea()}
              className="rounded-lg border border-ns-alternate px-2 text-xs font-semibold disabled:opacity-50"
            >
              {t("addIdea")}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-ns-alternate/70 bg-ns-surface/60 p-4">
          <p className={LABEL_CLASS}>{t("linkedArticles")}</p>
          {(project.articleIds?.length ?? 0) === 0 ? (
            <p className="text-xs text-ns-secondary">{t("noLinkedArticles")}</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {(project.articleIds ?? []).slice(-8).reverse().map((id) => (
                <li key={id}>
                  <Link
                    href={`/articles/${id}`}
                    className="text-sm font-semibold text-ns-tertiary underline hover:text-ns-primary"
                  >
                    {id.slice(0, 8)}…
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {siblings.filter((s) => s.id !== project.id).length > 0 && (
          <div className="rounded-2xl border border-ns-alternate/70 bg-ns-surface/60 p-4">
            <p className={LABEL_CLASS}>{t("siblingsTitle")}</p>
            <p className="mb-2 text-xs text-ns-secondary">{t("siblingsHint")}</p>
            <ul className="space-y-2">
              {siblings
                .filter((s) => s.id !== project.id)
                .slice(0, 8)
                .map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/projects/${s.id}`}
                      className="text-sm font-semibold text-ns-tertiary underline hover:text-ns-primary"
                    >
                      {s.emoji || "🎯"} {s.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <Link
          href="/articles/new"
          className="block rounded-xl border border-ns-primary/40 bg-ns-primary/10 px-4 py-3 text-center text-sm font-bold text-ns-tertiary hover:bg-ns-primary/20"
        >
          {t("goCreatePost")}
        </Link>
      </aside>
    </div>
  );
}
