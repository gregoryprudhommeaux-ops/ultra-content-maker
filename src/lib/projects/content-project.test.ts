import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendContentProjectChat,
  applyLucyProposalToProject,
  buildNewContentProject,
  buildProjectNewsInterestQuery,
  buildValidatedChips,
  ctaPreferenceHint,
  formatSiblingProjectsSummary,
  ideaHitFromNewsSuggestion,
  isProjectFrameReady,
  isRefineProposalField,
  newsSourceFromIdeaHit,
  parseLucyChatResponse,
  parseLucyPendingProposal,
  refineInstructionFromProposal,
  resolveGenerateIdea,
  sortIdeasByStars,
} from "./content-project";

describe("content-project helpers", () => {
  it("builds a new project with defaults", () => {
    const p = buildNewContentProject("x", { name: "LA MESA" });
    assert.equal(p.name, "LA MESA");
    assert.equal(p.chat.length, 0);
    assert.equal(p.ideas.length, 0);
    assert.ok(p.emoji);
  });

  it("appends chat and caps history", () => {
    let p = {
      ...buildNewContentProject("p1"),
      id: "p1",
    };
    p = appendContentProjectChat(p, [{ role: "user", content: "hello" }]);
    assert.equal(p.chat.length, 1);
    assert.equal(p.chat[0]?.role, "user");
    p = appendContentProjectChat(p, [{ role: "assistant", content: "hi" }]);
    assert.equal(p.chat.length, 2);
  });

  it("formats sibling project summaries", () => {
    const text = formatSiblingProjectsSummary(
      [
        { id: "a", name: "LA MESA", brief: "Dinners GDL" },
        { id: "b", name: "IA", brief: "Agents & UCM" },
      ],
      "a",
    );
    assert.match(text, /IA/);
    assert.doesNotMatch(text, /LA MESA/);
  });

  it("sorts ideas by stars", () => {
    const sorted = sortIdeasByStars([
      { id: "1", title: "low", stars: 3, reason: "" },
      { id: "2", title: "high", stars: 5, reason: "" },
    ]);
    assert.equal(sorted[0]?.title, "high");
  });

  it("builds news interest from explicit keywords or brief", () => {
    assert.equal(
      buildProjectNewsInterestQuery({
        name: "LA MESA",
        brief: "ignored",
        newsInterestQuery: "dîners privés GDL",
      }),
      "dîners privés GDL",
    );
    const fromBrief = buildProjectNewsInterestQuery({
      name: "IA",
      brief: "agents, LinkedIn, B2B",
    });
    assert.match(fromBrief, /IA/);
    assert.match(fromBrief, /agents/);
  });

  it("maps news suggestion to idea + newsSource", () => {
    const idea = ideaHitFromNewsSuggestion({
      id: "n1",
      title: "Mexico nearshoring",
      summary: "FDI up",
      url: "https://example.com/a",
      publishedAt: "2026-07-01",
      sourceName: "Reuters",
    });
    assert.equal(idea.source, "news");
    assert.equal(idea.url, "https://example.com/a");
    const src = newsSourceFromIdeaHit(idea);
    assert.equal(src?.url, "https://example.com/a");
    assert.equal(src?.sourceName, "Reuters");
  });

  it("resolves selected idea for generate", () => {
    const ideas = [
      { id: "1", title: "a", stars: 5, reason: "" },
      { id: "2", title: "b", stars: 4, reason: "", url: "https://x.com" },
    ];
    assert.equal(resolveGenerateIdea(ideas, "2")?.id, "2");
    assert.equal(resolveGenerateIdea(ideas)?.id, "1");
    assert.ok(ctaPreferenceHint("soft")?.includes("soft"));
  });

  it("isProjectFrameReady requires language + job + brief or idea", () => {
    assert.equal(
      isProjectFrameReady({
        contentLanguage: "fr",
        contentJob: "teaser",
        brief: "short",
        ideas: [],
      }),
      false,
    );
    assert.equal(
      isProjectFrameReady({
        contentLanguage: "fr",
        contentJob: "teaser",
        brief: "x".repeat(50),
        ideas: [],
      }),
      true,
    );
    assert.equal(
      isProjectFrameReady({
        contentLanguage: "fr",
        contentJob: "teaser",
        brief: "",
        ideas: [{ id: "1", title: "Angle", stars: 4, reason: "" }],
      }),
      true,
    );
  });

  it("parses Lucy chat proposal payload", () => {
    const parsed = parseLucyChatResponse({
      reply: "On part en FR ?",
      pendingProposal: {
        field: "contentLanguage",
        value: "fr",
        label: "Langue FR",
      },
      suggestedIdea: { title: "Nearshoring", reason: "fit", stars: 5 },
      choices: ["  Oui, FR ", "Plutôt EN", "Oui, FR", "", 42],
    });
    assert.ok(parsed);
    assert.equal(parsed?.pendingProposal?.field, "contentLanguage");
    assert.equal(parsed?.suggestedIdea?.title, "Nearshoring");
    assert.deepEqual(parsed?.choices, ["Oui, FR", "Plutôt EN"]);
    assert.equal(parseLucyPendingProposal({ field: "nope", value: "x", label: "y" }), undefined);
    assert.equal(parseLucyChatResponse({ reply: "hi" })?.choices, undefined);
  });

  it("applies proposals and builds chips", () => {
    let p = { ...buildNewContentProject("p"), id: "p" };
    p = applyLucyProposalToProject(p, {
      field: "contentLanguage",
      value: "fr",
      label: "FR",
    });
    p = applyLucyProposalToProject(p, {
      field: "contentJob",
      value: "teaser",
      label: "teaser",
    });
    assert.equal(p.contentLanguage, "fr");
    assert.equal(p.contentJob, "teaser");
    const chips = buildValidatedChips(p);
    assert.ok(chips.some((c) => c.field === "contentLanguage"));
    assert.ok(!chips.some((c) => c.field === "emojiLevel"));
    p = applyLucyProposalToProject(p, {
      field: "emojiLevel",
      value: "light",
      label: "light",
    });
    assert.equal(p.emojiLevel, "light");
    assert.ok(!buildValidatedChips(p).some((c) => c.field === "emojiLevel"));
    p = applyLucyProposalToProject(p, {
      field: "brief",
      value:
        "Dîners privés GDL · 14–16 places · désirabilité sans hard sell · ICP founders MX",
      label: "Brief enrichi",
    });
    assert.match(p.brief, /founders MX/);
    assert.ok(isRefineProposalField("refineHook"));
    assert.match(refineInstructionFromProposal({
      field: "refineHook",
      value: "plus punchy",
      label: "hook",
    }), /hook/i);
  });
});
