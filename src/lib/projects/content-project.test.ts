import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendContentProjectChat,
  buildNewContentProject,
  buildProjectNewsInterestQuery,
  ctaPreferenceHint,
  formatSiblingProjectsSummary,
  ideaHitFromNewsSuggestion,
  newsSourceFromIdeaHit,
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
});
