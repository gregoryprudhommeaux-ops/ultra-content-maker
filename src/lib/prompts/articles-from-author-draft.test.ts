import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAuthorDraftReviseSystemPrompt,
  buildAuthorDraftReviseUserPayload,
} from "@/lib/prompts/articles-from-author-draft";
import { buildInspirationArticleSystemPrompt } from "@/lib/prompts/articles-from-inspiration";
import { toArticleInspirationSource } from "@/lib/inspiration/wizard-context";

describe("author draft revise path", () => {
  it("uses revise semantics distinct from inspiration new-angle", () => {
    const revise = buildAuthorDraftReviseSystemPrompt("fr", "generalist");
    const inspire = buildInspirationArticleSystemPrompt("fr", "generalist");
    assert.match(revise, /REVISE that draft/i);
    assert.match(revise, /Do NOT invent new anecdotes/i);
    assert.doesNotMatch(revise, /create a distinct angle/i);
    assert.match(inspire, /distinct angle/i);
  });

  it("puts authorDraft in the user payload", () => {
    const draft =
      "Les gros réseaux ne ferment pas les deals. Les critères partagés oui. " +
      "Si personne ne partage le même problème, tu accumules des cafés.";
    const payload = buildAuthorDraftReviseUserPayload(
      "Persona test",
      "fr",
      draft,
      "niche",
    );
    const parsed = JSON.parse(payload) as { job?: string; authorDraft?: string };
    assert.equal(parsed.job, "REVISE_AUTHOR_DRAFT");
    assert.ok(parsed.authorDraft?.includes("critères partagés"));
  });

  it("maps draft context to inspirationSource kind=draft", () => {
    const source = toArticleInspirationSource({
      kind: "draft",
      excerpt:
        "Au Mexique j'ai refusé trois deals cette semaine parce que le fit table n'était pas là.",
    });
    assert.equal(source?.kind, "draft");
    assert.equal(source?.url, "ucm://author-draft");
  });
});
