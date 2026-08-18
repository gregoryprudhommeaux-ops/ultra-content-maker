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
    assert.match(prompt, /Spanish for the right-panel draft only/i);
    assert.match(prompt, /ALWAYS write "reply", "choices"/i);
    assert.match(prompt, /Stay in French/i);
    assert.match(prompt, /Do NOT follow the UI locale/i);
  });

  it("offers newProject when a draft already exists", () => {
    const withDraft = buildLucyProjectChatSystemPrompt("fr", {
      profileReadyForNews: true,
      hasDraft: true,
      frameReady: true,
    });
    assert.match(withDraft, /newProject/);
    assert.match(withDraft, /sibling/i);
    assert.match(withDraft, /NEVER mix/i);
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
    assert.equal(brief.productFrame, "la_mesa_dinners");
    assert.match(brief.pointOfView, /Nearshoring/);
    assert.ok(brief.problem.includes("Dîners"));
    assert.equal(brief.contentProjectName, "LA MESA");
  });

  it("does not leak LA MESA editorial frame into an unrelated project brief", () => {
    const ariesBrief =
      "ARIES District is a mixed-use prestige real estate project in the mountain corridor of La Libertad near Nuevo Cuscatlán, El Salvador. ICP: global investors and B2B capital. Not a Guadalajara dinner club.";
    const brief = buildPostBriefFromContentProject({
      name: "ARIES District - El Salvador Project",
      brief: ariesBrief,
      channelOwner: "la_mesa",
      productFrame: "la_mesa_dinners",
      contentJob: "explain",
      ideas: [],
    });
    assert.equal(brief.contentProjectName, "ARIES District - El Salvador Project");
    assert.match(brief.problem, /ARIES District/);
    assert.match(brief.problem, /El Salvador/);
    assert.notEqual(brief.productFrame, "la_mesa_dinners");
    assert.notEqual(brief.channelOwner, "la_mesa");
    assert.doesNotMatch(brief.proof, /Persona/i);
  });
});
