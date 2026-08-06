import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLucyProjectChatSystemPrompt,
  buildPostBriefFromContentProject,
} from "@/lib/prompts/lucy-project-chat";

describe("lucy-project-chat", () => {
  it("blocks news when profile is not ready", () => {
    const blocked = buildLucyProjectChatSystemPrompt("fr", {
      profileReadyForNews: false,
    });
    assert.match(blocked, /BLOCKED|Persona/i);
    const open = buildLucyProjectChatSystemPrompt("fr", {
      profileReadyForNews: true,
    });
    assert.match(open, /AVAILABLE|newsScan/i);
  });

  it("asks for pendingProposal and forbids writing the post in chat", () => {
    const prompt = buildLucyProjectChatSystemPrompt("fr", {
      profileReadyForNews: true,
      hasDraft: false,
      frameReady: false,
    });
    assert.match(prompt, /pendingProposal/);
    assert.match(prompt, /HARD BAN/i);
    assert.match(prompt, /NEVER write.*LinkedIn post/i);
    assert.match(prompt, /Living brief/i);
    assert.match(prompt, /\bbrief\b/);
    assert.match(prompt, /choices/);
    assert.match(prompt, /clickable/i);
    assert.match(prompt, /framePatch/);
    assert.match(prompt, /Persistence rule/i);
  });

  it("keeps chat language independent from production language", () => {
    const prompt = buildLucyProjectChatSystemPrompt("fr", {
      profileReadyForNews: true,
      hasDraft: true,
      frameReady: true,
      productionLanguage: "es",
    });
    assert.match(prompt, /Chat language is French/i);
    assert.match(prompt, /production language for the right-panel draft: Spanish/i);
    assert.match(prompt, /ALWAYS write "reply", "choices"/i);
  });

  it("offers newProject when a draft already exists", () => {
    const withDraft = buildLucyProjectChatSystemPrompt("fr", {
      profileReadyForNews: true,
      hasDraft: true,
      frameReady: true,
    });
    assert.match(withDraft, /newProject/);
    assert.match(withDraft, /sibling/i);
  });

  it("builds a post brief from project fields", () => {
    const brief = buildPostBriefFromContentProject({
      name: "LA MESA",
      brief: "Dîners privés GDL",
      channelOwner: "la_mesa",
      productFrame: "la_mesa_dinners",
      contentJob: "teaser",
      ideas: [
        {
          id: "1",
          title: "Nearshoring table",
          stars: 5,
          reason: "Theme fit",
        },
      ],
    });
    assert.equal(brief.contentJob, "teaser");
    assert.equal(brief.channelOwner, "la_mesa");
    assert.match(brief.pointOfView, /Nearshoring/);
    assert.ok(brief.problem.includes("Dîners"));
  });
});
