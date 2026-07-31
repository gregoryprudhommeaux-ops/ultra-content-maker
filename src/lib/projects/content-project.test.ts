import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendContentProjectChat,
  buildNewContentProject,
  formatSiblingProjectsSummary,
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
});
