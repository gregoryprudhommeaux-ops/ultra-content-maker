"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { useSubscription } from "@/contexts/subscription-context";
import {
  appendContentProjectChat,
  applyLucyProposalToProject,
  applyLucyFramePatch,
  buildProjectNewsInterestQuery,
  buildValidatedChips,
  contentProjectPatchFromApplied,
  ideaHitFromNewsSuggestion,
  isGenerateIntent,
  isProjectFrameReady,
  isRefineProposalField,
  missingProjectFrameFields,
  MIN_PROJECT_BRIEF_CHARS,
  newContentProjectMessageId,
  newsSourceFromIdeaHit,
  refineInstructionFromProposal,
  resolveGenerateIdea,
  sortIdeasByStars,
  type LucyFramePatch,
  type LucyNewProjectSeed,
  type LucyPendingProposal,
  type LucySuggestedIdea,
} from "@/lib/projects/content-project";
import { getClientAuth } from "@/lib/firebase/client";
import { hasClientLlmAccess, llmPayloadForAccess, llmPayloadForTier } from "@/lib/llm/client-payload";
import { buildPostBriefFromContentProject } from "@/lib/prompts/lucy-project-chat";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import { createDefaultRefinement } from "@/lib/articles/refinement";
import { buildDefaultSignaturePs } from "@/lib/articles/signature-ps";
import { useFormatUserError } from "@/hooks/use-format-user-error";
import { gatherAuthorSteeringPayload } from "@/lib/profile/gather-author-steering";
import { getPersona } from "@/lib/workspace/persona";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
  createArticleBatch,
  getArticle,
  updateArticleContent,
} from "@/lib/workspace/articles";
import { notifyArticlesChangedDeferred } from "@/lib/workspace/articles-events";
import {
  createContentProject,
  getContentProject,
  listContentProjects,
  updateContentProject,
} from "@/lib/workspace/content-projects";
import { BTN_PRIMARY, INPUT_CLASS, LABEL_CLASS, META_LABEL } from "@/lib/ui/nextstep";
import type {
  ContentLanguage,
  ContentProject,
  ContentProjectIdeaHit,
  NewsSuggestion,
} from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  projectId: string;
};

type LiveDraft = {
  articleId: string;
  hook: string;
  body: string;
  ps?: string;
  hashtags?: string[];
};

export function ProjectWorkspace({ projectId }: Props) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const chatLanguage: ContentLanguage =
    locale === "en" || locale === "es" || locale === "fr" ? locale : "fr";
  const { user } = useAuth();
  const { access } = useSubscription();
  const { progress } = useOnboardingProgress();
  const router = useRouter();
  const [project, setProject] = useState<ContentProject | null>(null);
  const [siblings, setSiblings] = useState<ContentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBrief, setSavingBrief] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [newsBusy, setNewsBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [pendingProposal, setPendingProposal] = useState<LucyPendingProposal | null>(null);
  const [pendingSuggestedIdea, setPendingSuggestedIdea] = useState<LucySuggestedIdea | null>(
    null,
  );
  const [liveDraft, setLiveDraft] = useState<LiveDraft | null>(null);
  const [pendingChoices, setPendingChoices] = useState<string[]>([]);
  const [pendingFramePatch, setPendingFramePatch] = useState<LucyFramePatch | null>(null);
  const [pendingNewProjectSeed, setPendingNewProjectSeed] = useState<LucyNewProjectSeed | null>(
    null,
  );
  const [newsPreview, setNewsPreview] = useState<NewsSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lastChatCountRef = useRef<number | null>(null);
  const formatUserError = useFormatUserError();

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
      if (!p) {
        setError(t("notFound"));
        return;
      }
      setBriefOpen(p.brief.trim().length < MIN_PROJECT_BRIEF_CHARS);
      const lastId = p.articleIds?.[p.articleIds.length - 1];
      if (lastId) {
        const article = await getArticle(user.uid, lastId);
        if (article) {
          setLiveDraft({
            articleId: article.id,
            hook: article.hook,
            body: article.body,
            ps: article.ps,
            hashtags: article.hashtags,
          });
        }
      }
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, projectId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // After project data mounts, pin the window to the top (chat has its own scroller).
  useEffect(() => {
    if (loading) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [loading, projectId]);

  // Keep the conversation pinned to its latest turn without scrolling the page.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const count = project?.chat?.length ?? 0;
    const isFirstRun = lastChatCountRef.current === null;
    const grew = !isFirstRun && count > (lastChatCountRef.current ?? 0);
    lastChatCountRef.current = count;
    el.scrollTo({ top: el.scrollHeight, behavior: grew ? "smooth" : "auto" });
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
    if (typeof next.brief === "string" && next.brief.trim().length >= MIN_PROJECT_BRIEF_CHARS) {
      setBriefOpen(false);
    }
  }

  async function appendAck(message: string, base?: ContentProject) {
    if (!user) return;
    const src = base ?? project;
    if (!src) return;
    const withAck = appendContentProjectChat(src, [
      { role: "assistant", content: message },
    ]);
    await updateContentProject(user.uid, src.id, { chat: withAck.chat });
    setProject(withAck);
  }

  async function scanNews(active: ContentProject) {
    if (!user || newsBusy) return;
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
          newsInterestQuery: buildProjectNewsInterestQuery(active),
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
          contentLanguage: active.contentLanguage ?? "fr",
          authorSteering,
          newsInterestQuery: buildProjectNewsInterestQuery(active),
          llm: llmPayload,
        }),
      });
      const data = (await res.json()) as { news?: NewsSuggestion[]; error?: string };
      if (!res.ok) {
        setError(t("newsFailed"));
        setNewsPreview([]);
        return;
      }
      const news = data.news ?? [];
      setNewsPreview(news);
      if (!news.length) {
        await appendAck(t("newsEmpty"), active);
        return;
      }
      const lines = news
        .slice(0, 5)
        .map((n, i) => `${i + 1}. ${n.title}`)
        .join("\n");
      await appendAck(`${t("newsScanResult")}\n${lines}\n\n${t("newsScanHint")}`, active);
    } catch {
      setError(t("newsFailed"));
    } finally {
      setNewsBusy(false);
    }
  }

  async function generateDraft(active: ContentProject) {
    if (!user || generating) return;
    if (!isProjectFrameReady(active)) {
      const missing = missingProjectFrameFields(active).join(", ");
      setError(t("frameIncompleteDetail", { missing }));
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const interest = buildProjectNewsInterestQuery(active);
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

      const contentLanguage = active.contentLanguage ?? "fr";
      const emojiLevel = active.emojiLevel ?? "light";
      const selectedIdea = resolveGenerateIdea(active.ideas, selectedIdeaId);
      const postBrief = normalizePostBrief(
        buildPostBriefFromContentProject(active, {
          selectedIdeaId: selectedIdea?.id ?? selectedIdeaId,
        }),
      );
      const newsSource = newsSourceFromIdeaHit(selectedIdea);
      const signaturePs =
        active.includeSignaturePs === true
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
          articleCount: 1,
          emojiLevel,
          postBrief,
          targetScope: "niche",
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
          contentProjectId: active.id,
          selectedCtaStyle: active.preferredCtaStyle,
        },
      );
      const articleId = ids[0];
      if (!articleId) {
        setError(t("generateFailed"));
        return;
      }

      const articleIds = [...(active.articleIds ?? []), articleId];
      await updateContentProject(user.uid, active.id, { articleIds });
      const nextProject = { ...active, articleIds, updatedAt: new Date() };
      setProject(nextProject);
      setLiveDraft({
        articleId,
        hook: item.hook,
        body: item.body,
        ps: signaturePs ?? item.ps,
        hashtags: item.hashtags,
      });
      notifyArticlesChangedDeferred();
      await appendAck(t("draftReadyAck"), nextProject);
    } catch {
      setError(t("generateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  async function refineDraft(active: ContentProject, proposal: LucyPendingProposal) {
    if (!user || !liveDraft || refining) return;
    setRefining(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [persona, llmProfile, authorSteering] = await Promise.all([
        getPersona(user.uid),
        getUserLlmProfile(user.uid),
        gatherAuthorSteeringPayload(user.uid),
      ]);
      const llmPayload = llmPayloadForAccess(llmProfile, access);
      if (!token || !hasClientLlmAccess(access, llmPayload)) {
        setError(t("needLlm"));
        return;
      }

      const refinement = {
        ...createDefaultRefinement(),
        emojiLevel: active.emojiLevel ?? "light",
        globalComment: refineInstructionFromProposal(proposal),
      };

      const article = await getArticle(user.uid, liveDraft.articleId);
      const res = await fetch("/api/articles/revise", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaPromptText: persona?.promptText ?? "",
          contentLanguage: active.contentLanguage ?? article?.contentLanguage ?? "fr",
          article: {
            hook: liveDraft.hook,
            body: liveDraft.body,
            ps: liveDraft.ps,
            hashtags: liveDraft.hashtags,
          },
          newsSource: article?.newsSource,
          refinement,
          postBrief: article?.postBrief,
          authorSteering,
          llm: llmPayload,
        }),
      });
      const data = (await res.json()) as {
        hook?: string;
        body?: string;
        ps?: string;
        hashtags?: string[];
        error?: string;
      };
      if (!res.ok || !data.body?.trim()) {
        setError(t("refineFailed"));
        return;
      }
      const revised = {
        hook: data.hook?.trim() ?? liveDraft.hook,
        body: data.body.trim(),
        ps: data.ps?.trim() || undefined,
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : liveDraft.hashtags,
      };
      await updateArticleContent(user.uid, liveDraft.articleId, revised);
      setLiveDraft({ ...liveDraft, ...revised });
      notifyArticlesChangedDeferred();
      await appendAck(t("refineReadyAck"), active);
    } catch {
      setError(t("refineFailed"));
    } finally {
      setRefining(false);
    }
  }

  async function applyFrameAndGenerate(
    base: ContentProject,
    framePatch: LucyFramePatch | null | undefined,
  ): Promise<ContentProject | null> {
    if (!user) return null;
    let working = base;
    if (framePatch) {
      working = applyLucyFramePatch(working, framePatch);
      const patch = contentProjectPatchFromApplied(base, working);
      if (Object.keys(patch).length > 0) {
        await updateContentProject(user.uid, working.id, patch);
      }
      setProject(working);
      if (framePatch.angle) {
        const top = resolveGenerateIdea(working.ideas)?.id ?? null;
        setSelectedIdeaId(top);
      }
    }
    if (!isProjectFrameReady(working)) {
      const missing = missingProjectFrameFields(working).join(", ");
      setError(t("frameIncompleteDetail", { missing }));
      await appendAck(t("frameStillIncompleteAck", { missing }), working);
      return null;
    }
    await generateDraft(working);
    return working;
  }

  async function validateProposal() {
    if (!user || !project || !pendingProposal) return;
    const proposal = pendingProposal;
    const newProjectSeed = pendingNewProjectSeed;
    setPendingProposal(null);
    setPendingChoices([]);
    setPendingNewProjectSeed(null);

    if (proposal.field === "newsScan") {
      await appendAck(t("ackValidated", { label: proposal.label }));
      await scanNews(project);
      return;
    }

    if (proposal.field === "readyToGenerate") {
      const patch = pendingFramePatch;
      setPendingFramePatch(null);
      const working = await applyFrameAndGenerate(project, patch);
      if (working) {
        await appendAck(t("ackValidated", { label: proposal.label }), working);
      }
      return;
    }

    if (proposal.field === "newProject") {
      const seed = newProjectSeed;
      const name =
        (typeof proposal.value === "string" && proposal.value.trim()) ||
        seed?.name?.trim() ||
        proposal.label.trim();
      if (!name) {
        setError(t("newProjectFailed"));
        return;
      }
      try {
        const created = await createContentProject(user.uid, {
          name,
          brief: seed?.brief || undefined,
          emoji: seed?.emoji || undefined,
          contentLanguage: seed?.contentLanguage ?? project.contentLanguage,
          contentJob: seed?.contentJob,
          channelOwner: seed?.channelOwner ?? project.channelOwner,
          productFrame: seed?.productFrame ?? project.productFrame,
        });
        if (seed?.angle?.trim()) {
          const idea: ContentProjectIdeaHit = {
            id: newContentProjectMessageId(),
            title: seed.angle.trim().slice(0, 200),
            stars: 4,
            reason: proposal.label.slice(0, 280),
            source: "lucy",
          };
          await updateContentProject(user.uid, created.id, { ideas: [idea] });
        }
        await appendAck(
          t("newProjectCreatedAck", { name: created.name }),
          project,
        );
        router.push(`/projects/${created.id}`);
      } catch {
        setError(t("newProjectFailed"));
      }
      return;
    }

    if (isRefineProposalField(proposal.field)) {
      await appendAck(t("ackValidated", { label: proposal.label }));
      await refineDraft(project, proposal);
      return;
    }

    let working = project;
    if (pendingSuggestedIdea && proposal.field === "angle") {
      const idea: ContentProjectIdeaHit = {
        id: newContentProjectMessageId(),
        title: pendingSuggestedIdea.title,
        stars: pendingSuggestedIdea.stars ?? 4,
        reason: pendingSuggestedIdea.reason || proposal.label,
        source: "lucy",
      };
      const ideas = sortIdeasByStars([...(working.ideas ?? []), idea]);
      working = { ...working, ideas, updatedAt: new Date() };
      setSelectedIdeaId(idea.id);
      setPendingSuggestedIdea(null);
      await updateContentProject(user.uid, working.id, { ideas });
      setProject(working);
      await appendAck(t("ackValidated", { label: proposal.label }), working);
      return;
    }

    const after = applyLucyProposalToProject(working, proposal);
    const patch = contentProjectPatchFromApplied(working, after);
    if (Object.keys(patch).length > 0) {
      await updateContentProject(user.uid, after.id, patch);
    }
    setProject(after);
    if (proposal.field === "brief") {
      setBriefOpen(false);
    }
    if (proposal.field === "angle") {
      const top = resolveGenerateIdea(after.ideas)?.id ?? null;
      setSelectedIdeaId(top);
    }
    await appendAck(t("ackValidated", { label: proposal.label }), after);
  }

  function modifyProposal() {
    if (!pendingProposal) return;
    setDraft(t("modifyPrefill", { label: pendingProposal.label }));
    setPendingProposal(null);
    setPendingSuggestedIdea(null);
    setPendingChoices([]);
    setPendingFramePatch(null);
    setPendingNewProjectSeed(null);
  }

  async function addNewsAsIdea(news: NewsSuggestion) {
    if (!project) return;
    const already = (project.ideas ?? []).some((i) => i.url && i.url === news.url);
    if (already) {
      setError(t("newsAlreadyAdded"));
      return;
    }
    setError(null);
    const idea = ideaHitFromNewsSuggestion(news, 4);
    const ideas = sortIdeasByStars([...(project.ideas ?? []), idea]);
    setSelectedIdeaId(idea.id);
    setNewsPreview((prev) => prev.filter((n) => n.id !== news.id));
    await persist({ ideas }, { ...project, ideas, updatedAt: new Date() });
  }

  async function sendMessage(override?: string) {
    const text = (override ?? draft).trim();
    if (!user || !project || !text || chatBusy) return;
    const userMessage = text;
    if (!override) setDraft("");
    setChatBusy(true);
    setError(null);
    setPendingProposal(null);
    setPendingSuggestedIdea(null);
    setPendingChoices([]);
    setPendingFramePatch(null);
    setPendingNewProjectSeed(null);

    const withUser = appendContentProjectChat(project, [
      { role: "user", content: userMessage },
    ]);
    setProject(withUser);

    try {
      await updateContentProject(user.uid, project.id, { chat: withUser.chat });

      // User asked to generate and the frame is already locked → skip Lucy prose,
      // write a short ack and fill the right-hand draft panel.
      if (isGenerateIntent(userMessage) && isProjectFrameReady(withUser)) {
        const withAck = appendContentProjectChat(withUser, [
          { role: "assistant", content: t("generatingToPanelAck") },
        ]);
        await updateContentProject(user.uid, withAck.id, { chat: withAck.chat });
        setProject(withAck);
        setChatBusy(false);
        await generateDraft(withUser);
        return;
      }

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
            emojiLevel: withUser.emojiLevel,
            preferredCtaStyle: withUser.preferredCtaStyle,
            includeSignaturePs: withUser.includeSignaturePs,
            ideas: withUser.ideas,
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
          hasDraft: Boolean(liveDraft),
          chatLanguage,
          contentLanguage: withUser.contentLanguage ?? "fr",
          llm: llmPayload,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        pendingProposal?: LucyPendingProposal | null;
        suggestedIdea?: LucySuggestedIdea | null;
        choices?: string[] | null;
        framePatch?: LucyFramePatch | null;
        newProjectSeed?: LucyNewProjectSeed | null;
        briefPatch?: string | null;
        autoGenerate?: boolean;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !data.reply?.trim()) {
        if (data.error === "no_llm_key") {
          setError(t("needLlm"));
        } else {
          const info = formatUserError({
            errorCode: data.error,
            detail: data.detail,
            fallbackMessage: t("chatFailed"),
          });
          setError(info.technical ? `${info.message} · ${info.technical}` : info.message);
        }
        setChatBusy(false);
        return;
      }

      let withLucy = appendContentProjectChat(withUser, [
        { role: "assistant", content: data.reply.trim() },
      ]);
      const briefFromLucy =
        typeof data.briefPatch === "string" ? data.briefPatch.trim() : "";
      if (briefFromLucy.length >= MIN_PROJECT_BRIEF_CHARS) {
        withLucy = { ...withLucy, brief: briefFromLucy };
        await updateContentProject(user.uid, project.id, {
          chat: withLucy.chat,
          brief: briefFromLucy,
        });
        setBriefOpen(false);
      } else {
        await updateContentProject(user.uid, project.id, { chat: withLucy.chat });
      }
      setProject(withLucy);

      // User asked to generate → apply framePatch and fill the right panel immediately.
      if (
        data.autoGenerate &&
        data.pendingProposal?.field === "readyToGenerate"
      ) {
        setPendingProposal(null);
        setPendingFramePatch(null);
        setPendingChoices([]);
        setChatBusy(false);
        const working = await applyFrameAndGenerate(withLucy, data.framePatch);
        if (working) {
          await appendAck(t("draftReadyAck"), working);
        }
        return;
      }

      if (data.pendingProposal?.field && data.pendingProposal.label) {
        setPendingProposal(data.pendingProposal);
      }
      if (data.suggestedIdea?.title) {
        setPendingSuggestedIdea(data.suggestedIdea);
      }
      if (Array.isArray(data.choices) && data.choices.length > 0) {
        setPendingChoices(data.choices.slice(0, 6));
      }
      if (data.framePatch && typeof data.framePatch === "object") {
        setPendingFramePatch(data.framePatch);
      }
      if (data.newProjectSeed && typeof data.newProjectSeed === "object") {
        setPendingNewProjectSeed(data.newProjectSeed);
      }
    } catch {
      setError(t("chatFailed"));
    } finally {
      setChatBusy(false);
    }
  }

  function reopenChip(field: string, label: string) {
    setDraft(t("reopenChipPrefill", { label }));
    setPendingProposal(null);
    setPendingChoices([]);
    setPendingFramePatch(null);
    setPendingNewProjectSeed(null);
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

  const chips = buildValidatedChips(project);
  const frameReady = isProjectFrameReady(project);
  const busy = chatBusy || generating || refining || newsBusy;

  return (
    <div className="mx-auto grid w-full max-w-[1680px] gap-6 px-4 py-8 [overflow-anchor:none] sm:px-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8 xl:px-10">
      {/* —— Chat column —— */}
      <div className="min-w-0 space-y-4 [overflow-anchor:none]">
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

        <div
          ref={chatScrollRef}
          className="flex max-h-[56vh] min-h-[280px] flex-col gap-3 overflow-y-auto rounded-2xl border border-ns-alternate/70 bg-white p-4 shadow-sm"
        >
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
        </div>

        {pendingProposal && (
          <div className="rounded-xl border border-ns-primary/40 bg-ns-primary/10 px-3 py-3">
            <p className="text-xs font-semibold text-ns-tertiary">
              {t("proposalLabel")}: {pendingProposal.label}
            </p>
            {pendingProposal.field === "brief" && typeof pendingProposal.value === "string" && (
              <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-ns-primary/20 bg-white/70 px-2.5 py-2 text-xs leading-relaxed text-ns-tertiary">
                {pendingProposal.value}
              </p>
            )}
            {pendingProposal.field === "newProject" && (
              <p className="mt-2 text-xs leading-relaxed text-ns-secondary">
                {t("newProjectHint", {
                  name:
                    (typeof pendingProposal.value === "string" && pendingProposal.value) ||
                    pendingNewProjectSeed?.name ||
                    pendingProposal.label,
                })}
                {pendingNewProjectSeed?.angle
                  ? ` · ${pendingNewProjectSeed.angle}`
                  : ""}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void validateProposal()}
                className={`${BTN_PRIMARY} disabled:opacity-50`}
              >
                {t("validate")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={modifyProposal}
                className="rounded-lg border border-ns-alternate px-3 py-2 text-xs font-bold uppercase tracking-wide text-ns-tertiary disabled:opacity-50"
              >
                {t("modify")}
              </button>
            </div>
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
              {t("chipsTitle")}
            </span>
            {chips.map((chip) => (
              <button
                key={`${chip.field}-${chip.label}`}
                type="button"
                onClick={() => reopenChip(chip.field, chip.label)}
                className="rounded-full border border-ns-alternate bg-white px-2.5 py-1 text-[11px] font-semibold text-ns-tertiary hover:border-ns-primary/50"
                title={t("chipReopenHint")}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {newsPreview.length > 0 && (
          <div className="space-y-2 rounded-xl border border-ns-alternate/60 bg-ns-surface/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
              {t("newsTitle")}
            </p>
            <ul className="space-y-2">
              {newsPreview.slice(0, 5).map((n) => (
                <li key={n.id} className="rounded-lg bg-white px-2.5 py-2">
                  <p className="text-sm font-semibold text-ns-tertiary">{n.title}</p>
                  <button
                    type="button"
                    className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ns-primary underline"
                    onClick={() => void addNewsAsIdea(n)}
                  >
                    {t("newsAddIdea")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pendingChoices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingChoices.map((choice) => (
              <button
                key={choice}
                type="button"
                disabled={busy}
                onClick={() => void sendMessage(choice)}
                className="rounded-full border border-ns-primary/50 bg-ns-primary/10 px-3 py-1.5 text-xs font-semibold text-ns-tertiary transition-colors hover:bg-ns-primary/20 disabled:opacity-50"
              >
                {choice}
              </button>
            ))}
          </div>
        )}

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

        {siblings.filter((s) => s.id !== project.id).length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
              {t("siblingsTitle")}
            </p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {siblings
                .filter((s) => s.id !== project.id)
                .slice(0, 6)
                .map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/projects/${s.id}`}
                      className="text-xs font-semibold text-ns-tertiary underline hover:text-ns-primary"
                    >
                      {s.emoji || "🎯"} {s.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* —— Article live column —— */}
      <aside className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-ns-alternate/70 bg-white shadow-sm">
          <button
            type="button"
            className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left"
            onClick={() => setBriefOpen((o) => !o)}
            aria-expanded={briefOpen}
          >
            <span className="min-w-0 flex-1">
              <span className={LABEL_CLASS}>{t("briefLabel")}</span>
              {!briefOpen && project.brief.trim() && (
                <span className="mt-1 block truncate text-xs text-ns-secondary">
                  {project.brief.trim()}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-ns-secondary">{briefOpen ? "−" : "+"}</span>
          </button>
          {briefOpen && (
            <div className="border-t border-ns-alternate/50 px-4 pb-3 pt-2">
              <p className="mb-2 text-xs text-ns-secondary">{t("briefHint")}</p>
              <ImeSafeTextarea
                rows={4}
                value={project.brief}
                onValueChange={(brief) => setProject({ ...project, brief })}
                onBlur={() => void saveBrief({ brief: project.brief })}
                className={INPUT_CLASS}
                placeholder={t("briefPlaceholder")}
                disabled={savingBrief}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-ns-alternate/70 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className={LABEL_CLASS}>{t("draftPanelTitle")}</p>
            {!frameReady && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                {t("frameIncompleteBadge")}
              </span>
            )}
          </div>

          {!liveDraft ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-ns-alternate bg-ns-surface/40 px-4 py-10 text-center">
              <p className="text-sm text-ns-secondary">{t("draftEmpty")}</p>
              <p className="mt-2 text-xs text-ns-secondary">{t("draftEmptyHint")}</p>
              {frameReady && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void generateDraft(project)}
                  className={`${BTN_PRIMARY} mt-4 disabled:opacity-50`}
                >
                  {generating ? t("generating") : t("generateDraft")}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                  Hook
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-ns-tertiary">
                  {liveDraft.hook}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                  Body
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ns-tertiary">
                  {liveDraft.body}
                </p>
              </div>
              {liveDraft.ps?.trim() && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                    PS
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ns-secondary">
                    {liveDraft.ps}
                  </p>
                </div>
              )}
              {(generating || refining) && (
                <p className="text-xs font-semibold text-ns-primary">
                  {generating ? t("generating") : t("refining")}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href={`/articles/${liveDraft.articleId}`}
                  className={`${BTN_PRIMARY} inline-flex`}
                >
                  {t("openEditor")}
                </Link>
                <button
                  type="button"
                  disabled={busy || !frameReady}
                  onClick={() => void generateDraft(project)}
                  className="rounded-lg border border-ns-alternate px-3 py-2 text-xs font-bold uppercase tracking-wide text-ns-tertiary disabled:opacity-50"
                >
                  {t("regenerate")}
                </button>
              </div>
            </div>
          )}
        </div>

        {(project.articleIds?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-ns-alternate/70 bg-ns-surface/60 p-4">
            <p className={LABEL_CLASS}>{t("linkedArticles")}</p>
            <ul className="mt-2 space-y-1">
              {(project.articleIds ?? [])
                .slice(-6)
                .reverse()
                .map((id) => (
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
          </div>
        )}
      </aside>
    </div>
  );
}
