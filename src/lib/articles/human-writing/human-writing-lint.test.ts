import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lintHumanWriting } from "./human-writing-lint";
import { runHumanWritingChecklist } from "./human-writing-checklist";

describe("lintHumanWriting · banned phrases", () => {
  it("flags French game changer and friction phrases", () => {
    const text =
      "Voici mon analyse. Baisser la friction reste un game changer dans notre secteur.";
    const violations = lintHumanWriting(text, { contentLanguage: "fr" });
    assert.ok(violations.some((v) => v.id === "banned_baisser_la_friction"));
    assert.ok(violations.some((v) => v.id === "banned_game_changer"));
  });

  it("flags dans un monde où", () => {
    const text = "Dans un monde où tout va vite, il faut rester focus.";
    const violations = lintHumanWriting(text, { contentLanguage: "fr" });
    assert.ok(violations.some((v) => v.id === "banned_dans_un_monde_ou"));
  });
});

describe("lintHumanWriting · em dashes", () => {
  it("warns when more than 2 em dashes", () => {
    const text =
      "Premier point — détail — autre angle — encore un — trop.";
    const violations = lintHumanWriting(text, { contentLanguage: "fr" });
    assert.ok(violations.some((v) => v.id === "em_dash_overuse"));
  });

  it("passes with 1–2 em dashes", () => {
    const text = "Une idée claire — et une nuance utile.";
    const violations = lintHumanWriting(text, { contentLanguage: "fr" });
    assert.equal(violations.some((v) => v.id === "em_dash_overuse"), false);
  });
});

describe("lintHumanWriting · two-sentence block pattern", () => {
  it("flags when every paragraph has exactly 2 sentences", () => {
    const text = `Première phrase ici. Deuxième phrase ici.

Troisième phrase là. Quatrième phrase là.

Cinquième phrase. Sixième phrase.`;

    const violations = lintHumanWriting(text, { contentLanguage: "fr" });
    assert.ok(violations.some((v) => v.id === "two_sentence_blocks"));
  });

  it("passes with mixed paragraph sizes", () => {
    const text = `Une seule ligne courte.

Trois phrases dans ce bloc. Elles varient un peu. Et ça casse le pattern.

Fin.`;

    const violations = lintHumanWriting(text, { contentLanguage: "fr" });
    assert.equal(violations.some((v) => v.id === "two_sentence_blocks"), false);
  });
});

describe("lintHumanWriting · emoji rules", () => {
  it("flags more than 3 emojis", () => {
    const text = "💡 Point un. 📌 Point deux. 🎯 Point trois. ✅ Point quatre.";
    const violations = lintHumanWriting(text, { contentLanguage: "en" });
    assert.ok(violations.some((v) => v.id === "emoji_count"));
  });

  it("flags emoji at start of most lines", () => {
    const text = `💡 First line here
📌 Second line here
🎯 Third line here
✅ Fourth line`;
    const violations = lintHumanWriting(text, { contentLanguage: "en" });
    assert.ok(violations.some((v) => v.id === "emoji_line_start"));
  });
});

describe("lintHumanWriting · not X it's Y", () => {
  it("errors when pattern appears more than once", () => {
    const text =
      "Ce n'est pas un outil, c'est une méthode. Et ce n'est pas une mode, c'est une évidence.";
    const violations = lintHumanWriting(text, { contentLanguage: "fr" });
    assert.ok(violations.some((v) => v.id === "not_x_its_y"));
  });
});

describe("runHumanWritingChecklist", () => {
  it("returns critical summary for heavy violations", () => {
    const text = `💡 Ligne un
📌 Ligne deux
🎯 Ligne trois
✅ Ligne quatre

Game changer — friction — monde — encore — trop.`;

    const result = runHumanWritingChecklist(text, { contentLanguage: "en" });
    assert.equal(result.passed, false);
    assert.ok(result.score < 8);
    assert.equal(result.summary, "critical");
  });
});
