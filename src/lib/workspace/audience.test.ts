import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { audiencePatchPayload } from "./audience";

describe("audiencePatchPayload", () => {
  it("only writes keys present on the input (partial niche update)", () => {
    const payload = audiencePatchPayload({ contentNiche: "F&B LatAm" });
    assert.equal(payload.contentNiche, "F&B LatAm");
    assert.equal("targetLabel" in payload, false);
    assert.equal("contentFocus" in payload, false);
    assert.equal("skipped" in payload, false);
    assert.ok("updatedAt" in payload);
  });

  it("does not clear skipped when only newsInterestQuery is updated", () => {
    const payload = audiencePatchPayload({
      newsInterestQuery: "supply chain Mexico",
    });
    assert.equal(payload.newsInterestQuery, "supply chain Mexico");
    assert.equal("skipped" in payload, false);
  });

  it("can explicitly set skipped without wiping other fields", () => {
    const payload = audiencePatchPayload({ skipped: true });
    assert.equal(payload.skipped, true);
    assert.equal("targetLabel" in payload, false);
  });

  it("clears a string field when explicitly set empty", () => {
    const payload = audiencePatchPayload({ contentNiche: "" });
    assert.equal(payload.contentNiche, null);
  });
});
