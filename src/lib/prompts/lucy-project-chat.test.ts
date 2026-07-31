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
    assert.match(open, /AVAILABLE/i);
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
