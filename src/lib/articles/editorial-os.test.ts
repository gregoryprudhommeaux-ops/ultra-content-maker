import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectSlop } from "./slop-detector";
import { shouldHumanizeArticle } from "./humanize-article-pass";
import { normalizePostBrief } from "./post-brief-objectives";
import {
  buildEditorialOsPromptBlock,
  resolveLinkedInHashtagCount,
} from "./editorial-os";
import { normalizeHashtagsForBrief } from "../linkedin/hashtags";
import type { PostBrief } from "@/types/workspace";

describe("editorial OS", () => {
  it("normalizes contentJob, channelOwner, productFrame", () => {
    const brief = normalizePostBrief({
      objectives: [{ objective: "credibility", priority: 1 }],
      problem: "x",
      pointOfView: "y",
      proof: "z",
      contentJob: "teaser",
      channelOwner: "gregory",
      productFrame: "la_mesa_dinners",
    });
    assert.equal(brief.contentJob, "teaser");
    assert.equal(brief.channelOwner, "gregory");
    assert.equal(brief.productFrame, "la_mesa_dinners");
  });

  it("caps hashtags at 2 for teaser / gregory / la_mesa dinners", () => {
    assert.equal(
      resolveLinkedInHashtagCount({ contentJob: "teaser" } as PostBrief),
      2,
    );
    assert.equal(
      resolveLinkedInHashtagCount({ channelOwner: "gregory" } as PostBrief),
      2,
    );
    assert.equal(
      resolveLinkedInHashtagCount({
        productFrame: "la_mesa_dinners",
      } as PostBrief),
      2,
    );
    assert.equal(resolveLinkedInHashtagCount({} as PostBrief), 4);
    assert.deepEqual(
      normalizeHashtagsForBrief(["a", "b", "c", "d"], {
        contentJob: "teaser",
      } as PostBrief),
      ["a", "b"],
    );
  });

  it("builds editorial OS prompt for LA MESA dinners", () => {
    const block = buildEditorialOsPromptBlock({
      objectives: [],
      problem: "",
      pointOfView: "",
      proof: "",
      contentJob: "teaser",
      channelOwner: "gregory",
      productFrame: "la_mesa_dinners",
    });
    assert.match(block, /CONTENT JOB/);
    assert.match(block, /TEASER/);
    assert.match(block, /la_mesa_dinners/);
    assert.match(block, /Hashtags: exactly 2/);
    assert.match(block, /business cards|tarjetas/i);
  });

  it("flags obsolete business-card metaphor as blocking", () => {
    const text =
      "Sin eso, solo se trata de coleccionar tarjetas de visita en Guadalajara.";
    const slop = detectSlop(text, { contentLanguage: "es" });
    assert.ok(slop.flags.includes("obsolete_business_card_metaphor"));
    const gate = shouldHumanizeArticle(text, "es");
    assert.equal(gate.run, true);
  });

  it("flags market-entry mismatch only for la_mesa_dinners frame", () => {
    const text =
      "Con LA MESA ayudo a la pyme europea en su desarrollo internacional.";
    assert.ok(
      !detectSlop(text, { contentLanguage: "es" }).flags.includes(
        "la_mesa_market_entry_mismatch",
      ),
    );
    assert.ok(
      detectSlop(text, {
        contentLanguage: "es",
        productFrame: "la_mesa_dinners",
      }).flags.includes("la_mesa_market_entry_mismatch"),
    );
  });

  it("flags geo_sector_filler on interchangeable market openers", () => {
    const filler =
      "Au Mexique, aujourd'hui les entreprises cherchent encore du réseau de qualité.";
    assert.ok(
      detectSlop(filler, { contentLanguage: "fr" }).flags.includes(
        "geo_sector_filler",
      ),
    );
    const anchored =
      "Au Mexique j'ai refus\u00e9 3 deals cette semaine parce que le fit table n'\u00e9tait pas l\u00e0.";
    assert.ok(
      !detectSlop(anchored, { contentLanguage: "fr" }).flags.includes(
        "geo_sector_filler",
      ),
    );
  });

  it("flags self_title_hook, thread_meta_promise, hindsight_regret_hook", () => {
    assert.ok(
      detectSlop(
        "En tant que serial entrepreneur, voici ce que j'ai appris sur le r\u00e9seau.",
        { contentLanguage: "fr" },
      ).flags.includes("self_title_hook"),
    );
    assert.ok(
      detectSlop(
        "Ce thread va changer ta fa\u00e7on de voir le networking.",
        { contentLanguage: "fr" },
      ).flags.includes("thread_meta_promise"),
    );
    assert.ok(
      detectSlop("I wish I knew this earlier about warm intros.", {
        contentLanguage: "en",
      }).flags.includes("hindsight_regret_hook"),
    );
  });
});
