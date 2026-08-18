import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slimAuthorSteeringForProject } from "@/lib/profile/author-steering-context";
import { buildArticlesUserPromptWithCount } from "@/lib/prompts/articles-generate";
import { buildPostBriefInstruction } from "@/lib/prompts/post-brief";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";

describe("project isolation in generation", () => {
  it("keeps contentProjectName through normalizePostBrief", () => {
    const brief = normalizePostBrief({
      problem: "ARIES District in El Salvador",
      pointOfView: "Credibility via on-the-ground access",
      proof: "Corridor La Libertad",
      contentProjectName: "ARIES District - El Salvador Project",
      contentProjectBrief: "Mixed-use prestige real estate · El Salvador.",
    });
    assert.equal(brief.contentProjectName, "ARIES District - El Salvador Project");
    assert.match(brief.contentProjectBrief ?? "", /El Salvador/);
  });

  it("hard-walls the active project and forbids other offers", () => {
    const instruction = buildPostBriefInstruction(
      {
        objectives: [{ objective: "credibility", priority: 1 }],
        problem: "ARIES District mixed-use prestige real estate in El Salvador.",
        pointOfView: "Credibility through on-the-ground access.",
        proof: "La Libertad corridor near Nuevo Cuscatlán.",
        contentJob: "explain",
        contentProjectName: "ARIES District - El Salvador Project",
        contentProjectBrief:
          "ARIES District · mixed-use prestige real estate · La Libertad, El Salvador.",
      },
      "en",
      { companyName: "LA MESA" },
    );
    assert.match(instruction, /ACTIVE CONTENT PROJECT/i);
    assert.match(instruction, /ARIES District/);
    assert.match(instruction, /El Salvador/);
    assert.match(instruction, /VOICE only/i);
    assert.doesNotMatch(instruction, /Company name "LA MESA" MUST appear/i);
  });

  it("does not inject the global content niche when a project is isolated", () => {
    const user = buildArticlesUserPromptWithCount(
      "Persona: Gregory runs LA MESA dinners in Guadalajara.",
      "en",
      1,
      undefined,
      "none",
      {
        objectives: [{ objective: "credibility", priority: 1 }],
        problem: "ARIES District in El Salvador",
        pointOfView: "On-the-ground access",
        proof: "La Libertad",
        contentProjectName: "ARIES District - El Salvador Project",
        contentProjectBrief: "ARIES District · El Salvador real estate.",
      },
      {
        audience: {
          contentNiche: "LA MESA private dinners in Guadalajara",
        },
      },
      "niche",
    );
    assert.doesNotMatch(user, /LA MESA private dinners in Guadalajara/);
    assert.match(user, /ACTIVE CONTENT PROJECT/i);
  });

  it("slims author steering to voice for project generation", () => {
    const slim = slimAuthorSteeringForProject({
      author: {
        roleTitle: "Founder",
        positioningLine: "I build private tables",
        contentArchetype: "founder_product",
        creationStrategySteering: "Always pitch LA MESA waitlist",
      },
      audience: {
        contentNiche: "LA MESA dinners GDL",
        contentFocus: "Guadalajara networking",
      },
      myPosts: [{ type: "linkedin", url: "https://linkedin.com/x" }],
      bioReferenceDocuments: [
        { label: "bio", kind: "pdf", text: "LA MESA · 14-16 guests in GDL" },
      ],
    });
    assert.equal(slim?.author?.roleTitle, "Founder");
    assert.equal(slim?.audience, undefined);
    assert.equal(slim?.myPosts, undefined);
    assert.equal(slim?.bioReferenceDocuments, undefined);
    assert.equal(slim?.author?.creationStrategySteering, undefined);
  });
});
